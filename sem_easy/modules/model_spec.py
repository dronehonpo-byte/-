"""モデル定義（測定モデル・構造モデル）と lavaan 構文の生成。

依頼者要望への対応：
- 測定モデルの矢印は必ず「潜在変数 → 観測変数」の向きで表す
  （例：自己効力感 → se_01。回答は潜在的性質の表れと考えるため）。
- モデル名は人手で付けず、**実際のパス構成から自動導出**する。
  これによりモデル名と描かれている矢印の内容が食い違うことがない。
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ModelSpec:
    """SEM モデルの定義。lavaan 構文の生成元となる単一の定義。"""

    # 潜在変数名 -> 観測変数（指標）のリスト。矢印は 潜在→観測。
    measurement: dict = field(default_factory=dict)
    # 一方向パス（回帰）: (原因, 結果) すなわち 原因→結果
    regressions: list = field(default_factory=list)
    # 双方向パス（共分散）: (変数1, 変数2)
    covariances: list = field(default_factory=list)
    # 利用者が付けた任意の別名（未設定なら自動導出名を使う）
    custom_name: str | None = None

    # ---- 変数の集合 ----
    @property
    def latents(self) -> list:
        return list(self.measurement.keys())

    @property
    def indicators(self) -> list:
        out = []
        for items in self.measurement.values():
            out.extend(items)
        return out

    def all_nodes(self) -> list:
        nodes = list(self.latents) + list(self.indicators)
        for a, b in self.regressions:
            for v in (a, b):
                if v not in nodes:
                    nodes.append(v)
        for a, b in self.covariances:
            for v in (a, b):
                if v not in nodes:
                    nodes.append(v)
        return nodes

    def structural_nodes(self) -> list:
        """構造モデル部分（潜在＋回帰に現れる観測変数）のノード。"""
        nodes = list(self.latents)
        for a, b in self.regressions:
            for v in (a, b):
                if v not in nodes:
                    nodes.append(v)
        return nodes

    # ---- lavaan 構文 ----
    def to_lavaan(self) -> str:
        """lavaan / semopy 互換の構文を生成する（再現コードにもそのまま使う）。"""
        lines: list[str] = []
        if self.measurement:
            lines.append("# 測定モデル（潜在変数 =~ 観測変数：矢印は潜在→観測）")
            for lat, items in self.measurement.items():
                if items:
                    lines.append(f"{lat} =~ " + " + ".join(items))
        if self.regressions:
            lines.append("# 構造モデル（結果 ~ 原因）")
            # 結果変数ごとにまとめる
            by_out: dict = {}
            for src, dst in self.regressions:
                by_out.setdefault(dst, []).append(src)
            for dst, srcs in by_out.items():
                lines.append(f"{dst} ~ " + " + ".join(srcs))
        if self.covariances:
            lines.append("# 共分散（双方向）")
            for a, b in self.covariances:
                lines.append(f"{a} ~~ {b}")
        return "\n".join(lines)

    # ---- 妥当性チェック ----
    def validate(self) -> list:
        """モデルが計算できる形かを検査し、問題点を日本語で返す。"""
        problems: list[str] = []
        for lat, items in self.measurement.items():
            if len(items) == 0:
                problems.append(f"潜在変数『{lat}』に観測変数が割り当てられていません。")
            elif len(items) < 2:
                problems.append(
                    f"潜在変数『{lat}』の観測変数が {len(items)} 個です。"
                    "潜在変数は通常3個以上（最低2個）の観測変数が必要です。"
                )
        # 観測変数の重複割当て（クロス負荷）
        seen: dict = {}
        for lat, items in self.measurement.items():
            for it in items:
                seen.setdefault(it, []).append(lat)
        for it, lats in seen.items():
            if len(lats) > 1:
                problems.append(
                    f"観測変数『{it}』が複数の潜在変数（{', '.join(lats)}）に"
                    "割り当てられています（クロス負荷）。意図的でなければ見直してください。"
                )
        # 自己ループ
        for src, dst in self.regressions:
            if src == dst:
                problems.append(f"『{src}』から自分自身へのパスは指定できません。")
        # 双方向の重複（A→B と B→A）
        pairs = set()
        for src, dst in self.regressions:
            if (dst, src) in pairs:
                problems.append(
                    f"『{src}』と『{dst}』の間に相互のパスが指定されています"
                    "（同時推定は識別困難な場合があります）。"
                )
            pairs.add((src, dst))
        if not self.measurement and not self.regressions:
            problems.append("モデルが空です。潜在変数またはパスを指定してください。")
        return problems

    # ---- モデル名の自動導出（名前と中身を必ず一致させる）----
    def derive_name(self) -> str:
        if self.custom_name:
            return self.custom_name
        return derive_structural_label(self.regressions)

    def signature(self) -> str:
        """モデル構造の一意な指紋（重複候補の除去に使う）。"""
        m = ";".join(f"{k}=~{'+'.join(sorted(v))}" for k, v in sorted(self.measurement.items()))
        r = ";".join(sorted(f"{a}->{b}" for a, b in self.regressions))
        c = ";".join(sorted("~~".join(sorted([a, b])) for a, b in self.covariances))
        return f"{m}|{r}|{c}"


def derive_structural_label(regressions: list) -> str:
    """パス構成から日本語のモデル名を導出する。

    名前は必ず実際の矢印から作るため、名前と図の内容が食い違わない。
    """
    if not regressions:
        return "測定モデルのみ（CFA）"

    edges = [(a, b) for a, b in regressions]
    srcs = {a for a, _ in edges}
    dsts = {b for _, b in edges}

    # 媒介構造の検出：X→M, M→Y が存在するか
    mediators = []
    for mid in srcs & dsts:
        has_in = any(b == mid for _, b in edges)
        has_out = any(a == mid for a, _ in edges)
        if has_in and has_out:
            mediators.append(mid)

    if mediators:
        # X→M→Y に対して X→Y（直接効果）があるか
        direct_found = False
        for mid in mediators:
            xs = [a for a, b in edges if b == mid]
            ys = [b for a, b in edges if a == mid]
            for x in xs:
                for y in ys:
                    if (x, y) in edges:
                        direct_found = True
        if direct_found:
            return f"部分媒介モデル（媒介：{', '.join(mediators)}）"
        return f"完全媒介モデル（媒介：{', '.join(mediators)}）"

    if len(edges) == 1:
        a, b = edges[0]
        return f"直接効果モデル（{a}→{b}）"
    return f"直接効果モデル（パス{len(edges)}本）"

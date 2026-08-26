"""再現用コードの生成（R/lavaan・Python）。

依頼者要望：モデル式だけでなく、**データの読み込みから結果の出力まで**を含め、
別の研究者が同じ条件で実行できる形にする。
"""
from __future__ import annotations


def lavaan_code(result, data_path: str = "your_data.csv") -> str:
    """R / lavaan の再現コード（照合用）。"""
    s = result.settings
    est_map = {"MLW": "ML", "FIML": "ML", "DWLS": "WLSMV", "ULS": "ULS"}
    est = est_map.get(result.estimator, "ML")
    missing = "fiml" if s.get("欠損値の扱い") == "fiml" else "listwise"
    ordered = ""
    ord_vars = s.get("順序尺度変数") or []
    if ord_vars:
        ordered = ",\n  ordered = c(" + ", ".join(f'"{v}"' for v in ord_vars) + ")"

    return f'''# ============================================================
# SEM 再現コード（R / lavaan）
# 生成: {s.get("実行日時", "")}
# アプリ: SEMEasy {s.get("アプリ版", "")}
# 元の推定法: {result.estimator} / 欠損: {s.get("欠損値の扱い")}
# ============================================================
library(lavaan)

# 1. データ読み込み
data <- read.csv("{data_path}", fileEncoding = "UTF-8")

# 2. モデル定義（測定モデルの矢印は 潜在 =~ 観測）
model <- '
{result.lavaan_syntax}
'

# 3. 推定
fit <- sem(
  model,
  data = data,
  estimator = "{est}",
  missing = "{missing}"{ordered}
)

# 4. 結果の出力
summary(fit, fit.measures = TRUE, standardized = TRUE, rsquare = TRUE)
parameterEstimates(fit, standardized = TRUE, ci = TRUE)
fitMeasures(fit, c("chisq","df","pvalue","cfi","tli",
                   "rmsea","rmsea.ci.lower","rmsea.ci.upper","srmr","aic","bic"))

# 5. 間接効果・総効果を推定する場合は、モデル定義に以下のようにラベルを付けます
#    例）  M ~ a*X
#          Y ~ b*M + c*X
#          indirect := a*b
#          total    := c + a*b
'''


def python_code(result, data_path: str = "your_data.csv") -> str:
    """Python / semopy の再現コード（本アプリと同一の計算）。"""
    s = result.settings
    return f'''# ============================================================
# SEM 再現コード（Python / semopy）
# 生成: {s.get("実行日時", "")}
# アプリ: SEMEasy {s.get("アプリ版", "")} / semopy {s.get("semopy版", "")}
# 乱数シード: {s.get("乱数シード")}（同じデータ・設定なら常に同じ結果）
# ============================================================
import numpy as np
import pandas as pd
from semopy import Model, calc_stats

np.random.seed({s.get("乱数シード", 42)})

# 1. データ読み込み
data = pd.read_csv("{data_path}", encoding="utf-8")

# 2. 使用する変数（このモデルで実際に使った列）
use_cols = {s.get("使用変数", [])!r}
data = data[use_cols].apply(pd.to_numeric, errors="coerce")

# 3. 欠損値の扱い（{s.get("欠損値の扱い")}）
{"data = data.dropna()" if s.get("欠損値の扱い") != "fiml" else "# FIML のため行の除外は行わない"}

# 4. モデル定義（矢印は 潜在 =~ 観測）
desc = """
{result.lavaan_syntax}
"""

# 5. 推定（推定法: {result.estimator}）
model = Model(desc)
res = model.fit(data, obj="{result.estimator}")
print(res)

# 6. 係数（非標準化・標準化・標準誤差・p値）
params = model.inspect(std_est=True)
print(params)

# 7. 適合度指標
print(calc_stats(model).T)
'''


def settings_table(result) -> list:
    """分析条件の一覧（プロジェクト保存・レポートに使う）。"""
    s = result.settings
    rows = [
        {"項目": "モデル名", "内容": result.model_name},
        {"項目": "推定法", "内容": result.estimator},
        {"項目": "欠損値の扱い", "内容": str(s.get("欠損値の扱い"))},
        {"項目": "ブートストラップ回数", "内容": str(s.get("ブートストラップ回数"))},
        {"項目": "乱数シード", "内容": str(s.get("乱数シード"))},
        {"項目": "分析に用いた標本数", "内容": f"{result.n_used:,}"},
        {"項目": "読み込んだ全標本数", "内容": f"{result.n_total:,}"},
        {"項目": "推定パラメータ数", "内容": str(result.fit.npar)},
        {"項目": "使用変数", "内容": ", ".join(map(str, s.get("使用変数", [])))},
        {"項目": "未使用の変数", "内容": ", ".join(map(str, result.unused_vars)) or "なし"},
        {"項目": "アプリ版", "内容": str(s.get("アプリ版"))},
        {"項目": "計算エンジン", "内容": f"semopy {s.get('semopy版')}"},
        {"項目": "実行日時", "内容": str(s.get("実行日時"))},
    ]
    return rows

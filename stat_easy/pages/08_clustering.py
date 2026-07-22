"""⑦ グループに分ける（クラスタリング）ページ。

k-means / 階層的クラスタリングで、似たデータどうしを自動でグループ化する。
"""
from __future__ import annotations

import streamlit as st
import pandas as pd

from modules import common, data_loader, clustering, visualizer

common.require_password()  # 全ページでパスワード必須（直接アクセス時も保護）
from exporters import excel_exporter, pdf_exporter

df = common.require_data()

st.title("🧩 グループに分ける")
st.markdown(
    "似たデータどうしを自動でまとめて、いくつかの **クラスタ（グループ）** に分けます。"
    "正解ラベルが無くてもデータの構造を発見できる手法（教師なし学習）です。"
    "まず最適なクラスタ数を検討してから、k-means または階層的クラスタリングを実行できます。"
)
st.caption("計算は scikit-learn / scipy のみで行います（生成 AI は使用しません）。")

# ---- 特徴量 ----
numeric_cols = data_loader.numeric_columns(df)
features = st.multiselect(
    "特徴量（グループ分けに使う数値列）",
    numeric_cols,
    default=numeric_cols,
    help="この列の値が似ているデータどうしを同じグループにまとめます。",
)

# ---- セクション1：クラスタ数の検討 ----
st.subheader("1. クラスタ数の検討")
st.markdown(
    "Elbow 法（慣性の減り方）とシルエット係数から、適切なクラスタ数の目安を提示します。"
)
if st.button("クラスタ数を検討する"):
    if not features:
        st.error("特徴量を1つ以上選んでください。")
    else:
        try:
            with st.spinner("クラスタ数を検討しています…"):
                suggestion = clustering.suggest_k(df, features)
            st.session_state["cluster_suggestion"] = suggestion
        except Exception as e:  # noqa: BLE001
            st.error(f"クラスタ数の検討中にエラーが発生しました: {e}")

suggestion = st.session_state.get("cluster_suggestion")
if suggestion is not None:
    try:
        fig_es = visualizer.elbow_silhouette(suggestion)
        st.pyplot(fig_es)
        c1, c2 = st.columns(2)
        c1.download_button(
            "PNG をダウンロード",
            data=visualizer.fig_to_bytes(fig_es, fmt="png"),
            file_name="elbow_silhouette.png",
            mime="image/png",
            key="dl_es_png",
        )
        c2.download_button(
            "SVG をダウンロード",
            data=visualizer.fig_to_bytes(fig_es, fmt="svg"),
            file_name="elbow_silhouette.svg",
            mime="image/svg+xml",
            key="dl_es_svg",
        )
    except Exception as e:  # noqa: BLE001
        st.error(f"図の作成に失敗しました: {e}")
    st.info(f"推奨されるクラスタ数： **k = {suggestion.suggested_k}**")

# ---- セクション2：クラスタリング実行 ----
st.subheader("2. クラスタリングの実行")

method_choice = st.radio("手法", ["k-means", "階層的クラスタリング"], horizontal=True)

default_k = suggestion.suggested_k if suggestion is not None else 3
# クラスタ数の上限は 50（ただしサンプル数-1 を超えられない）
n_valid = len(df[features].dropna()) if features else len(df)
k_max = max(2, min(50, n_valid - 1))
k = st.slider(
    "クラスタ数 (k)", min_value=2, max_value=k_max,
    value=min(int(default_k), k_max),
)

linkage_method = "ward"
if method_choice == "階層的クラスタリング":
    method_label = st.radio(
        "結合方法", ["Ward法", "Complete法", "Average法"], horizontal=True
    )
    linkage_method = {"Ward法": "ward", "Complete法": "complete", "Average法": "average"}[
        method_label
    ]

if st.button("クラスタリング実行", type="primary"):
    if not features:
        st.error("特徴量を1つ以上選んでください。")
    else:
        try:
            with st.spinner("クラスタリングを実行しています…"):
                if method_choice == "k-means":
                    result = clustering.kmeans(df, k, features)
                else:
                    result = clustering.hierarchical(df, k, linkage_method, features)
            st.session_state["cluster_result"] = result
            st.session_state["cluster_method"] = method_choice
        except Exception as e:  # noqa: BLE001
            st.error(f"クラスタリング中にエラーが発生しました: {e}")

result = st.session_state.get("cluster_result")
if result is not None:
    # ---- 警告（階層的・大規模データのサンプリングなど）----
    for w in result.extra.get("warnings", []) or []:
        st.warning(w)

    # ---- クラスタ別サマリー ----
    st.subheader("クラスタ別サマリー")
    st.caption("各クラスタの件数と、特徴量ごとの平均値です。")
    st.dataframe(result.cluster_summary, use_container_width=True)

    # ---- PCA 散布図 ----
    if result.pca_coords is not None:
        st.subheader("PCA 散布図")
        st.caption("特徴量を2次元に圧縮し、クラスタを色分けして表示します。")
        try:
            fig_pca = visualizer.pca_scatter(
                result.pca_coords, result.labels, result.pca_explained
            )
            st.pyplot(fig_pca)
            c1, c2 = st.columns(2)
            c1.download_button(
                "PNG をダウンロード",
                data=visualizer.fig_to_bytes(fig_pca, fmt="png"),
                file_name="pca_scatter.png",
                mime="image/png",
                key="dl_pca_png",
            )
            c2.download_button(
                "SVG をダウンロード",
                data=visualizer.fig_to_bytes(fig_pca, fmt="svg"),
                file_name="pca_scatter.svg",
                mime="image/svg+xml",
                key="dl_pca_svg",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"PCA 散布図の作図に失敗しました: {e}")

    # ---- デンドログラム（階層的のみ）----
    linkage_z = result.extra.get("linkage")
    if linkage_z is not None:
        st.subheader("デンドログラム")
        st.caption("データがどのように結合されていくかを樹形図で示します。")
        try:
            fig_dn = visualizer.dendrogram_plot(linkage_z)
            st.pyplot(fig_dn)
            c1, c2 = st.columns(2)
            c1.download_button(
                "PNG をダウンロード",
                data=visualizer.fig_to_bytes(fig_dn, fmt="png"),
                file_name="dendrogram.png",
                mime="image/png",
                key="dl_dn_png",
            )
            c2.download_button(
                "SVG をダウンロード",
                data=visualizer.fig_to_bytes(fig_dn, fmt="svg"),
                file_name="dendrogram.svg",
                mime="image/svg+xml",
                key="dl_dn_svg",
            )
        except Exception as e:  # noqa: BLE001
            st.error(f"デンドログラムの作図に失敗しました: {e}")

    # ---- クラスタ付きデータのダウンロード ----
    st.subheader("クラスタ付きデータのダウンロード")
    st.caption("各行にクラスタ番号（cluster 列）を付けたデータです。")
    csv_bytes = result.df_with_clusters.to_csv(index=False).encode("utf-8-sig")
    st.download_button(
        "CSV をダウンロード",
        data=csv_bytes,
        file_name="clustered_data.csv",
        mime="text/csv",
        key="dl_cluster_csv",
    )

common.render_footer()

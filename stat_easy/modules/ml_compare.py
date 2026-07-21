"""⑥ 機械学習モデルの自動比較。

目的変数の型から分類/回帰を自動判定し、複数モデルを k-fold 交差検証で比較する。
すべて scikit-learn / xgboost で計算（生成 AI 不使用）。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import data_loader

LARGE_DATA_THRESHOLD = 100_000
SUBSAMPLE_N = 20_000


@dataclass
class MLResult:
    mode: str  # "classification" or "regression"
    comparison: pd.DataFrame
    best_model_name: str
    feature_importance: pd.DataFrame = None
    roc_data: dict = field(default_factory=dict)  # model_name -> (fpr, tpr, auc)
    warnings: list = field(default_factory=list)
    target: str = ""
    confusion_matrix: object = None  # 最優秀モデルの混同行列 (ndarray)
    confusion_labels: list = field(default_factory=list)


def detect_mode(y: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(y) and y.nunique() > 10:
        return "regression"
    return "classification"


def _build_models(mode: str):
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.linear_model import LogisticRegression, Ridge
    from sklearn.svm import SVC, SVR
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor

    models = {}
    if mode == "classification":
        models["Random Forest"] = RandomForestClassifier(n_estimators=200, random_state=42)
        models["Logistic Regression"] = LogisticRegression(max_iter=1000)
        models["SVM"] = SVC(probability=True, random_state=42)
        models["K-Nearest Neighbors"] = KNeighborsClassifier()
        try:
            from xgboost import XGBClassifier

            models["XGBoost"] = XGBClassifier(
                n_estimators=200, eval_metric="logloss", random_state=42, verbosity=0
            )
        except Exception:
            pass
    else:
        models["Random Forest"] = RandomForestRegressor(n_estimators=200, random_state=42)
        models["Ridge Regression"] = Ridge()
        models["SVM"] = SVR()
        models["K-Nearest Neighbors"] = KNeighborsRegressor()
        try:
            from xgboost import XGBRegressor

            models["XGBoost"] = XGBRegressor(n_estimators=200, random_state=42, verbosity=0)
        except Exception:
            pass
    return models


def compare(
    df: pd.DataFrame,
    target: str,
    features: list[str] | None = None,
    k: int = 5,
    mode: str | None = None,
    allow_subsample: bool = True,
) -> MLResult:
    from sklearn.model_selection import cross_validate, StratifiedKFold, KFold
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.pipeline import Pipeline

    warnings: list[str] = []
    data = df.dropna(subset=[target]).copy()

    if features is None:
        features = [c for c in data_loader.numeric_columns(df) if c != target]
    if not features:
        raise ValueError("特徴量となる数値列がありません。")

    data = data.dropna(subset=features)

    if len(data) > LARGE_DATA_THRESHOLD and allow_subsample:
        warnings.append(
            f"データが大規模（{len(data):,}行）のため、{SUBSAMPLE_N:,}行にサブサンプリングして実行しました。"
        )
        data = data.sample(SUBSAMPLE_N, random_state=42)

    y = data[target]
    X = data[features].astype(float)

    if mode is None:
        mode = detect_mode(y)

    if mode == "classification":
        y_enc = LabelEncoder().fit_transform(y.astype(str))
        scoring = ["accuracy", "precision_macro", "recall_macro", "f1_macro", "roc_auc_ovr"]
        cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    else:
        y_enc = y.astype(float).to_numpy()
        scoring = ["neg_root_mean_squared_error", "neg_mean_absolute_error", "r2"]
        cv = KFold(n_splits=k, shuffle=True, random_state=42)

    models = _build_models(mode)
    rows = []
    for name, est in models.items():
        pipe = Pipeline([("scaler", StandardScaler()), ("model", est)])
        try:
            cvres = cross_validate(
                pipe, X, y_enc, cv=cv, scoring=scoring, return_train_score=True,
                error_score="raise",
            )
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"{name} は評価できませんでした: {exc}")
            continue
        row = {"モデル": name}
        if mode == "classification":
            row["AUC"] = round(np.nanmean(cvres["test_roc_auc_ovr"]), 4)
            row["Accuracy"] = round(cvres["test_accuracy"].mean(), 4)
            row["Precision"] = round(cvres["test_precision_macro"].mean(), 4)
            row["Recall"] = round(cvres["test_recall_macro"].mean(), 4)
            row["F1"] = round(cvres["test_f1_macro"].mean(), 4)
            train_f1 = cvres["train_f1_macro"].mean()
            row["_gap"] = train_f1 - cvres["test_f1_macro"].mean()
            row["_score"] = row["F1"]
        else:
            row["RMSE"] = round(-cvres["test_neg_root_mean_squared_error"].mean(), 4)
            row["MAE"] = round(-cvres["test_neg_mean_absolute_error"].mean(), 4)
            row["R²"] = round(cvres["test_r2"].mean(), 4)
            row["_gap"] = cvres["train_r2"].mean() - cvres["test_r2"].mean()
            row["_score"] = row["R²"]
        rows.append(row)

    if not rows:
        raise ValueError("すべてのモデルで評価に失敗しました。データを確認してください。")

    comp = pd.DataFrame(rows).sort_values("_score", ascending=False).reset_index(drop=True)

    # 過学習診断
    for _, r in comp.iterrows():
        if r["_gap"] > 0.2:
            warnings.append(
                f"{r['モデル']}: 訓練と検証のスコア差が大きく（{r['_gap']:.2f}）、"
                "過学習の可能性があります。"
            )

    best_name = comp.iloc[0]["モデル"]
    comp_display = comp.drop(columns=["_gap", "_score"])

    # 最優秀モデルの特徴量重要度
    fi = _feature_importance(models[best_name], X, y_enc, features, mode)

    # ROC（分類のみ、各モデルを 1 回 train/test split で）
    roc_data = {}
    cm, cm_labels = None, []
    if mode == "classification":
        if len(np.unique(y_enc)) == 2:
            roc_data = _roc_curves(models, X, y_enc)
        cm, cm_labels = _confusion_for_best(
            models[best_name], X, y, y_enc)

    return MLResult(
        mode=mode, comparison=comp_display, best_model_name=best_name,
        feature_importance=fi, roc_data=roc_data, warnings=warnings, target=target,
        confusion_matrix=cm, confusion_labels=cm_labels,
    )


def _confusion_for_best(estimator, X, y_raw, y_enc):
    """最優秀分類モデルの混同行列を train/test split で算出する。"""
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import confusion_matrix
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    try:
        labels = sorted(np.unique(y_enc).tolist())
        # 元のクラス名（ラベルエンコード前）を順序通りに対応づける
        uniq_raw = pd.Series(y_raw).astype(str)
        name_map = {}
        for code in labels:
            mask = y_enc == code
            name_map[code] = uniq_raw[mask].iloc[0] if mask.any() else str(code)
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y_enc, test_size=0.3, random_state=42, stratify=y_enc)
        pipe = Pipeline([("scaler", StandardScaler()), ("model", estimator)])
        pipe.fit(X_tr, y_tr)
        pred = pipe.predict(X_te)
        cm = confusion_matrix(y_te, pred, labels=labels)
        return cm, [name_map[c] for c in labels]
    except Exception:
        return None, []


def _feature_importance(estimator, X, y, features, mode) -> pd.DataFrame:
    from sklearn.preprocessing import StandardScaler

    Xs = StandardScaler().fit_transform(X)
    try:
        est = estimator
        est.fit(Xs, y)
        if hasattr(est, "feature_importances_"):
            imp = est.feature_importances_
        elif hasattr(est, "coef_"):
            coef = np.asarray(est.coef_)
            imp = np.abs(coef).ravel()[: len(features)]
        else:
            return None
    except Exception:
        return None
    return (
        pd.DataFrame({"特徴量": features, "重要度": np.round(imp, 4)})
        .sort_values("重要度", ascending=False)
        .reset_index(drop=True)
    )


def _roc_curves(models, X, y) -> dict:
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_curve, auc
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    out = {}
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    for name, est in models.items():
        try:
            pipe = Pipeline([("scaler", StandardScaler()), ("model", est)])
            pipe.fit(X_tr, y_tr)
            if hasattr(pipe, "predict_proba"):
                prob = pipe.predict_proba(X_te)[:, 1]
            elif hasattr(pipe.named_steps["model"], "decision_function"):
                prob = pipe.decision_function(X_te)
            else:
                continue
            fpr, tpr, _ = roc_curve(y_te, prob)
            out[name] = (fpr, tpr, auc(fpr, tpr))
        except Exception:
            continue
    return out

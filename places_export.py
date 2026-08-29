#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Places API を使って指定した業種・エリアの企業リストを Excel で出力するスクリプト。

出力カラム:
    店名 / 住所 / 電話番号 / カテゴリ / HP URL / Google Maps URL / 評価(星) / 口コミ数

使い方:
    1. `.env` ファイルに GOOGLE_PLACES_API_KEY=... を記述する
    2. 下の KEYWORD / AREA を書き換える
    3. `python places_export.py` を実行する
"""

import os
import sys
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
from openpyxl import Workbook

# ==================================================================
# ここを書き換えるだけで業種・エリアを変更できます
# ==================================================================
KEYWORD = "歯科医院"            # 業種・キーワード
AREA = "埼玉県さいたま市"        # エリア
# ==================================================================

# Google Places API のエンドポイント
TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

# 取得する最大ページ数(1ページ最大20件 → 3ページで最大60件)
MAX_PAGES = 3

# Excel のヘッダー
HEADERS = [
    "店名",
    "住所",
    "電話番号",
    "カテゴリ",
    "HP URL",
    "Google Maps URL",
    "評価(星)",
    "口コミ数",
]


def load_api_key():
    """.env から API キーを読み込む。無ければ終了する。"""
    load_dotenv()
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("【エラー】APIキーが見つかりません。")
        print("  .env ファイルに GOOGLE_PLACES_API_KEY=あなたのキー を記述してください。")
        sys.exit(1)
    return api_key


def text_search(api_key, query):
    """
    Text Search を使って最大 MAX_PAGES ページ分の検索結果を取得する。
    next_page_token を使ってページ送りする。
    """
    results = []
    params = {
        "query": query,
        "language": "ja",   # 日本語で結果を取得
        "region": "jp",
        "key": api_key,
    }

    for page in range(1, MAX_PAGES + 1):
        try:
            resp = requests.get(TEXT_SEARCH_URL, params=params, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"【エラー】検索リクエストに失敗しました: {e}")
            break

        data = resp.json()
        status = data.get("status")

        # ステータスチェック
        if status not in ("OK", "ZERO_RESULTS"):
            message = data.get("error_message", "詳細不明")
            print(f"【エラー】APIがエラーを返しました (status={status}): {message}")
            break

        page_results = data.get("results", [])
        results.extend(page_results)
        print(f"  {page}ページ目: {len(page_results)}件取得 (累計 {len(results)}件)")

        # 次のページのトークンを取得
        next_token = data.get("next_page_token")
        if not next_token:
            break  # これ以上ページが無い

        # next_page_token は発行直後は使えないため少し待つ
        time.sleep(2)
        params = {"pagetoken": next_token, "key": api_key}

    return results


def get_place_details(api_key, place_id):
    """
    Place Details を使って電話番号・HP URL・Google Maps URL を取得する。
    Text Search だけでは取れない項目を補完する。
    """
    params = {
        "place_id": place_id,
        "language": "ja",
        "fields": "formatted_phone_number,website,url",
        "key": api_key,
    }
    try:
        resp = requests.get(PLACE_DETAILS_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  【警告】詳細取得に失敗しました (place_id={place_id}): {e}")
        return {}

    if data.get("status") != "OK":
        return {}

    return data.get("result", {})


def build_rows(api_key, places):
    """検索結果から Excel に書き込む行データを作る。"""
    rows = []
    total = len(places)
    for i, place in enumerate(places, start=1):
        name = place.get("name", "")
        print(f"  詳細取得中 ({i}/{total}): {name}")

        place_id = place.get("place_id", "")
        details = get_place_details(api_key, place_id) if place_id else {}

        # カテゴリ(types)を日本語表示用にまとめる
        types = place.get("types", [])
        category = "/".join(types) if types else ""

        rows.append([
            name,
            place.get("formatted_address", ""),
            details.get("formatted_phone_number", ""),
            category,
            details.get("website", ""),                       # HP URL(なければ空欄)
            details.get("url", ""),                           # Google Maps URL
            place.get("rating", ""),                          # 評価(星)
            place.get("user_ratings_total", ""),              # 口コミ数
        ])
    return rows


def save_to_excel(rows, filename):
    """行データを Excel(.xlsx)として保存する。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "企業リスト"

    # ヘッダー行
    ws.append(HEADERS)

    # データ行
    for row in rows:
        ws.append(row)

    # 列幅をざっくり自動調整(日本語も考慮して余裕を持たせる)
    widths = [30, 45, 18, 30, 35, 45, 10, 10]
    for col_idx, width in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = width

    wb.save(filename)


def main():
    print("=" * 50)
    print("Google Places API 企業リスト出力ツール")
    print("=" * 50)
    print(f"業種  : {KEYWORD}")
    print(f"エリア: {AREA}")
    print("-" * 50)

    api_key = load_api_key()
    query = f"{AREA} {KEYWORD}"

    print("検索を開始します...")
    places = text_search(api_key, query)

    if not places:
        print("【結果】該当する店舗が見つかりませんでした。")
        return

    print(f"検索完了: 合計 {len(places)}件 見つかりました。")
    print("-" * 50)
    print("各店舗の詳細情報を取得します...")
    rows = build_rows(api_key, places)

    # ファイル名: {AREA}_{KEYWORD}_{日付}.xlsx
    today = datetime.now().strftime("%Y%m%d")
    filename = f"{AREA}_{KEYWORD}_{today}.xlsx"

    save_to_excel(rows, filename)
    print("-" * 50)
    print(f"【完了】{len(rows)}件を出力しました。")
    print(f"  ファイル名: {filename}")


if __name__ == "__main__":
    main()

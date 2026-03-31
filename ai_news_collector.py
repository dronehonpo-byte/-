#!/usr/bin/env python3
"""
AI ニュース自動収集 & 分析スクリプト

RSSフィードからAI関連ニュースを取得し、Claude APIで分析して
Google Sheetsに保存します。
"""

import os
import json
import logging
import hashlib
from datetime import datetime

import feedparser
import anthropic
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

# ─── ログ設定 ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("ai_news_collector.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ─── 環境変数の読み込み ───────────────────────────────────
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_SHEETS_CREDENTIALS_FILE = os.getenv(
    "GOOGLE_SHEETS_CREDENTIALS_FILE", "credentials.json"
)
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")

# ─── RSSフィード一覧 ─────────────────────────────────────
# AI・自動化・ビジネス活用に関連するフィードを登録
RSS_FEEDS = [
    # 海外 AI 系
    {"name": "MIT Technology Review - AI", "url": "https://www.technologyreview.com/feed/"},
    {"name": "The Verge - AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"},
    {"name": "VentureBeat - AI", "url": "https://venturebeat.com/category/ai/feed/"},
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml"},
    {"name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/"},
    # 日本語 AI 系
    {"name": "AI-SCHOLAR", "url": "https://ai-scholar.tech/feed"},
    {"name": "Ledge.ai", "url": "https://ledge.ai/feed/"},
    {"name": "ITmedia AI+", "url": "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml"},
]

# ─── Claude API に送るプロンプト ──────────────────────────
ANALYSIS_PROMPT = """\
あなたはAI業界のアナリストです。以下の記事を分析し、日本の中小企業の実務者向けに
評価してください。

【記事タイトル】{title}
【記事内容】{content}

以下のJSON形式で必ず出力してください（JSON以外は出力しないでください）:

{{
  "summary": "3行で要約（改行区切り）",
  "importance_score": 1〜5の整数,
  "category": "モデル進化 / 自動化・エージェント / ビジネス活用 / 市場動向 / その他 のいずれか",
  "why_it_matters": "なぜ重要か（中小企業の視点で）",
  "business_use_case": "実務でどう使えるか（具体例を含む）",
  "sales_automation_relevance": "高 / 中 / 低 のいずれか",
  "content_idea": "発信ネタ3つ（配列）",
  "action": "Yes または No と理由"
}}

評価基準:
- 新規性: 既存情報の焼き直しでないか
- 実務応用可能性: 中小企業でも導入できるか
- 営業オートメーションへの接続可能性: 営業効率化に繋がるか
- 一過性のニュースではないか: 長期的に価値があるか
"""


def fetch_rss_articles(feeds: list[dict]) -> list[dict]:
    """
    RSSフィードから記事を取得する。

    Args:
        feeds: RSSフィード情報のリスト（name, url）

    Returns:
        記事情報のリスト（title, link, summary, source, published）
    """
    articles = []

    for feed_info in feeds:
        feed_name = feed_info["name"]
        feed_url = feed_info["url"]
        logger.info(f"フィード取得中: {feed_name}")

        try:
            feed = feedparser.parse(feed_url)

            if feed.bozo and not feed.entries:
                logger.warning(f"フィード解析エラー: {feed_name} - {feed.bozo_exception}")
                continue

            for entry in feed.entries[:5]:  # 各フィードから最新5件
                article = {
                    "title": entry.get("title", "タイトルなし"),
                    "link": entry.get("link", ""),
                    "summary": entry.get("summary", entry.get("description", "")),
                    "source": feed_name,
                    "published": entry.get("published", ""),
                }
                articles.append(article)

            logger.info(f"  → {len(feed.entries[:5])}件取得")

        except Exception as e:
            logger.error(f"フィード取得失敗: {feed_name} - {e}")

    logger.info(f"合計 {len(articles)} 件の記事を取得しました")
    return articles


def analyze_with_claude(title: str, content: str) -> dict | None:
    """
    Claude APIで記事を分析する。

    Args:
        title: 記事タイトル
        content: 記事本文（またはサマリー）

    Returns:
        分析結果の辞書、またはエラー時None
    """
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # 長すぎるコンテンツは切り詰める（トークン節約）
    if len(content) > 3000:
        content = content[:3000] + "..."

    prompt = ANALYSIS_PROMPT.format(title=title, content=content)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        # レスポンスからJSONを抽出
        response_text = message.content[0].text

        # JSONブロックが ```json ... ``` で囲まれている場合に対応
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        result = json.loads(response_text.strip())
        logger.info(f"  分析完了: importance={result.get('importance_score')}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON解析エラー: {e}\nレスポンス: {response_text}")
        return None
    except Exception as e:
        logger.error(f"Claude API エラー: {e}")
        return None


def get_article_hash(url: str) -> str:
    """記事URLからハッシュ値を生成する（重複チェック用）"""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def connect_to_sheets():
    """
    Google Sheetsに接続し、ワークシートを返す。

    Returns:
        gspread.Worksheet オブジェクト
    """
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]

    credentials = Credentials.from_service_account_file(
        GOOGLE_SHEETS_CREDENTIALS_FILE, scopes=scopes
    )
    gc = gspread.authorize(credentials)

    # スプレッドシートを開く
    spreadsheet = gc.open_by_key(SPREADSHEET_ID)

    # 最初のシートを使用（なければ作成）
    try:
        worksheet = spreadsheet.sheet1
    except Exception:
        worksheet = spreadsheet.add_worksheet(title="AI News", rows=1000, cols=20)

    # ヘッダーが未設定なら追加
    existing = worksheet.row_values(1)
    if not existing:
        headers = [
            "date",
            "source",
            "title",
            "url",
            "summary",
            "importance_score",
            "category",
            "why_it_matters",
            "business_use_case",
            "sales_automation_relevance",
            "content_idea",
            "action",
        ]
        worksheet.update("A1:L1", [headers])
        logger.info("ヘッダー行を追加しました")

    return worksheet


def get_existing_urls(worksheet) -> set[str]:
    """
    既にシートに登録済みのURLを取得する（重複防止用）。

    Args:
        worksheet: gspread.Worksheet

    Returns:
        登録済みURLのセット
    """
    try:
        # D列（url列）の全データを取得
        url_column = worksheet.col_values(4)
        # ヘッダーを除外
        return set(url_column[1:]) if len(url_column) > 1 else set()
    except Exception as e:
        logger.error(f"既存URL取得エラー: {e}")
        return set()


def save_to_sheets(worksheet, article: dict, analysis: dict):
    """
    分析結果をGoogle Sheetsに1行追加する。

    Args:
        worksheet: gspread.Worksheet
        article: 元記事の情報
        analysis: Claude APIの分析結果
    """
    # content_idea（配列）を文字列に変換
    content_ideas = analysis.get("content_idea", [])
    if isinstance(content_ideas, list):
        content_idea_str = "\n".join(f"・{idea}" for idea in content_ideas)
    else:
        content_idea_str = str(content_ideas)

    row = [
        datetime.now().strftime("%Y-%m-%d %H:%M"),
        article["source"],
        article["title"],
        article["link"],
        analysis.get("summary", ""),
        str(analysis.get("importance_score", "")),
        analysis.get("category", ""),
        analysis.get("why_it_matters", ""),
        analysis.get("business_use_case", ""),
        analysis.get("sales_automation_relevance", ""),
        content_idea_str,
        analysis.get("action", ""),
    ]

    try:
        worksheet.append_row(row, value_input_option="USER_ENTERED")
        logger.info(f"  シートに保存: {article['title'][:40]}...")
    except Exception as e:
        logger.error(f"シート書き込みエラー: {e}")


def main():
    """
    メイン処理:
    1. RSSフィードから記事を取得
    2. 各記事をClaude APIで分析
    3. 結果をGoogle Sheetsに保存
    """
    logger.info("=" * 60)
    logger.info("AI ニュース自動収集を開始します")
    logger.info("=" * 60)

    # --- 設定チェック ---
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY が設定されていません。.env を確認してください。")
        return

    if not SPREADSHEET_ID:
        logger.error("SPREADSHEET_ID が設定されていません。.env を確認してください。")
        return

    # --- Step 1: RSS記事を取得 ---
    logger.info("Step 1: RSSフィードから記事を取得中...")
    articles = fetch_rss_articles(RSS_FEEDS)

    if not articles:
        logger.warning("取得できた記事がありません。終了します。")
        return

    # --- Step 2: Google Sheetsに接続 & 既存URL取得 ---
    logger.info("Step 2: Google Sheetsに接続中...")
    try:
        worksheet = connect_to_sheets()
        existing_urls = get_existing_urls(worksheet)
        logger.info(f"  既存記事数: {len(existing_urls)}件")
    except Exception as e:
        logger.error(f"Google Sheets接続エラー: {e}")
        return

    # --- Step 3: 各記事を分析して保存 ---
    logger.info("Step 3: 記事を分析・保存中...")
    new_count = 0
    skip_count = 0

    for i, article in enumerate(articles, 1):
        # 重複チェック
        if article["link"] in existing_urls:
            logger.info(f"  [{i}/{len(articles)}] スキップ（登録済み）: {article['title'][:40]}...")
            skip_count += 1
            continue

        logger.info(f"  [{i}/{len(articles)}] 分析中: {article['title'][:40]}...")

        # Claude APIで分析
        analysis = analyze_with_claude(article["title"], article["summary"])

        if analysis:
            save_to_sheets(worksheet, article, analysis)
            new_count += 1
        else:
            logger.warning(f"  分析失敗のためスキップ: {article['title'][:40]}...")

    # --- 完了 ---
    logger.info("=" * 60)
    logger.info(f"完了！ 新規: {new_count}件 / スキップ: {skip_count}件 / 合計: {len(articles)}件")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()

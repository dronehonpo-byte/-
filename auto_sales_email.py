#!/usr/bin/env python3
"""企業の問い合わせフォーム送信用 営業メール自動生成スクリプト"""

import os
import sys
import anthropic


def generate_sales_emails(company_name: str, industry: str, challenge: str) -> str:
    """Claude APIを使って営業メール3パターンを生成する"""

    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 環境変数を使用

    prompt = f"""あなたは株式会社Miyabeeの営業メール作成担当です。
以下の条件で、企業の問い合わせフォームに送る営業メールを3パターン生成してください。

【送り主情報】
- 株式会社Miyabee
- 代表は慶應義塾大学在学中
- サービス名: KUHAKU
- ビジネスモデル: 成果報酬型（売上の50/50）、初期費用・月額費用ゼロ

【ターゲット企業情報】
- 企業名: {company_name}
- 業種: {industry}
- 想定される課題: {challenge}

【条件】
- 件名と本文をセットで3パターン作成
- 本文は300字以内（厳守）
- 成果報酬型でリスクゼロであることを必ず強調
- 堅すぎず、誠実さが伝わるトーン
- 各パターンは異なるアプローチ（例: 課題訴求型、実績訴求型、共感型など）

以下のフォーマットで出力してください:

===== パターン1 =====
【件名】（ここに件名）
【本文】
（ここに本文）

===== パターン2 =====
【件名】（ここに件名）
【本文】
（ここに本文）

===== パターン3 =====
【件名】（ここに件名）
【本文】
（ここに本文）
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("エラー: 環境変数 ANTHROPIC_API_KEY を設定してください")
        print("  export ANTHROPIC_API_KEY='sk-ant-...'")
        sys.exit(1)

    print("=== KUHAKU 営業メール自動生成ツール ===\n")

    company_name = input("企業名: ").strip()
    industry = input("業種: ").strip()
    challenge = input("企業の課題（推測でOK）: ").strip()

    if not all([company_name, industry, challenge]):
        print("エラー: すべての項目を入力してください")
        sys.exit(1)

    print("\n生成中...\n")

    try:
        result = generate_sales_emails(company_name, industry, challenge)
        print(result)
    except anthropic.APIError as e:
        print(f"API エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

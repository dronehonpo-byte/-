# ParticleEffects

`StarEffect.sks` はXcodeエディタでのみ作成可能なバイナリ形式のため、
現在はコード生成に置き換えています（`BaseGameScene.emitSparkles(at:count:)`）。

Xcodeで `.sks` ファイルを作成した場合は、`emitSparkles` を
`SKEmitterNode(fileNamed: "StarEffect")` に差し替えてください。

---
title: c++ reduce 使用法
published: 2025-11-15
updated: 2025-11-15
description: std::reduce は C++17 で導入されたアルゴリズムで、std::accumulate と同様に使用され、<numeric> ヘッダーファイルにあります。これは、配列やコンテナなどの範囲にある要素の「一般化された合計」を計算するために使用されます。これは、すべての要素を段階的に単一の結果にマージするのと似ています。デフォルトでは加算を使用しますが、乗算などのカスタム演算を定義することもできます。その主な利点は並列実行をサポートしていることで、大規模データに適しており、効率性を向上させます。
tags:
  - cpp
toc: true
lang: ja
abbrlink: cpp-reduce
---

## `reduce` の紹介

`std::reduce` は C++17 で導入されたアルゴリズムです。使い方は `<numeric>` ヘッダーファイルにある `std::accumulate` に似ています。これは、配列やコンテナなどの範囲内の要素の「一般化された合計」を計算するために使用されます。これは、すべての要素を段階的に 1 つの結果にマージするのと似ています。**デフォルトでは加算** を使用しますが、乗算などのカスタム演算を定義することもできます。主な利点は **並列実行のサポート** であり、大規模データに適しており、効率性を向上させます。

### 使用方法

#### デフォルト値なしの合計

`reduce` では、コンテナの `begin` イテレータと `end` イテレータを渡すだけで済みます。合計にはデフォルト値は必要ありません。

```cpp
void Reduce::Demo()
{
    // 最も単純な例は、`reduce` を使用して配列要素の合計を計算することです。
	// `reduce` にはデフォルト値はありません。
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    int sum = std::reduce(vec.begin(), vec.end());
    std::cout << "Reduce Sum: " << sum << std::endl;

    // 配列要素の合計を計算するには、accumulate を使用します。
    int accSum = std::accumulate(vec.begin(), vec.end(), 0);
    std::cout << "Accumulate Sum: " << accSum << std::endl;

    /*
    Reduce Sum: 15
    Accumulate Sum: 15
    */
}
```

#### デフォルト値を使用した結果の型キャスト

`reduce` と `accumulate` はどちらも、デフォルト値を使用して最終結果の型を変更できます。例えば、整数コンテナ内のすべての要素を合計する必要があるが、初期値 `init` が `double` 型の場合、すべての結果の合計は `double` 型になります。

```cpp
void Reduce::DemoWithInit()
{
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    auto sum = std::reduce(vec.begin(), vec.end(), 0.0);
    std::cout << "Reduce Sum: " << sum << std::endl;

    auto accSum = std::accumulate(vec.begin(), vec.end(), 0.0);
    std::cout << "Accumulate Sum: " << accSum << std::endl;

    // --- 型検証 ---
	// static_assert を使用して、コンパイル時に sum と accSum が double 型であるかどうかを検証します
    static_assert(std::is_same_v<decltype(sum), double>, "Type of 'sum' should be double");
    static_assert(std::is_same_v<decltype(accSum), double>, "Type of 'accSum' should be double");

    std::cout << "Type verification passed at compile time." << std::endl;
}
```

#### カスタム演算子

ラムダ式または関数内の演算子関数を使用して、カスタム演算を実行できます。

```cpp
void Reduce::CustomOp()
{
    // 方法 1: ラムダ式を使用してカスタム演算を定義し、累積乗算を実行します。
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    int res = std::reduce(vec.begin(), vec.end(), 1, [](int a, int b) {
        return a * b;
    });
    std::cout << "Custom Reduce Result: " << res << std::endl;

    res = std::accumulate(vec.begin(), vec.end(), 1, [](int a, int b) {
        return a * b;
    });
    std::cout << "Custom Accumulate Result: " << res << std::endl;

	// 方法 2: std::multiplies を使用してカスタム演算を実行し、累積乗算を実行します。
	/*
	#include <functional>
	一般的な演算子関数オブジェクトには以下が含まれます。
	std::plus<> // 加算
	std::minus<> // 減算
	std::multiplies<> // 乗算
	std::divides<> // 除算
	std::modulus<> // 剰余
	*/
#include <functional>
    res = std::reduce(vec.begin(), vec.end(), 1, std::multiplies<>());
    std::cout << "Custom Reduce with multiplies<> Result: " << res << std::endl;

    res = std::accumulate(vec.begin(), vec.end(), 1, std::multiplies<>());
    std::cout << "Custom Accumulate with multiplies<> Result: " << res << std::endl;

    /*
    Custom Reduce Result: 120
	Custom Accumulate Result: 120
	Custom Reduce with multiplies<> Result: 120
	Custom Accumulate with multiplies<> Result: 120
    */
}
```

### 機能

#### 並列計算

`accumulate` アルゴリズムは厳密に逐次的な計算のみをサポートしますが、`reduce` ではそうではありません。演算子が可換かつ結合的である場合（例：`a + (b + c) = (a + b) + c / a + b = b + a`）、`reduce` による並列計算は正確かつ効率的な計算を実現します。ただし、状況によっては並列計算が遅くなる可能性があることに注意することが重要です。

1. コンパイラと標準ライブラリの実装

MinGW-g++ 環境が並列実行用に正しく構成されていない可能性があります。デフォルトでは、g++ の C++17 並列アルゴリズムでは、Intel の Threading Building Blocks (TBB) などの特定のバックエンドライブラリへのリンクが必要になる場合があります。このライブラリがリンクされていない場合、`std::execution::par` はシーケンシャル実行に「デグレード」される可能性がありますが、並列チェックと準備のオーバーヘッドが発生し、通常のシーケンシャル実行よりも遅くなる可能性があります。

2. ハードウェアの制限

CPU のコア数が 1～2 個しかない場合、並列処理のメリットは非常に限られます。デュアルコア CPU では、理論上の速度向上はわずか 2 倍で、並列処理のオーバーヘッドによって簡単に相殺されてしまいます。

3. 並列処理のオーバーヘッド

- **スレッドの作成と管理**: ランタイムシステムはスレッドプールを起動し、計算タスクを複数のスレッドに分散させる必要があります。スレッドの作成、スケジュール設定、および破棄自体にも時間がかかります。

- **データ分割**: 1 億個の要素 (以下のコード例を参照) は、論理的に複数の小さなブロックに分割し、各ブロックをスレッドに割り当てて処理する必要があります。

- **中間結果の同期**: 各スレッドがそれぞれの小さなブロックの部分和を計算した後、すべてのスレッドで計算された部分和を加算（減算）して最終的な和を求める最終ステップが必要です。このマージステップにより、同期のオーバーヘッドが発生します。

```cpp
#include <chrono> // 高精度タイミング用
#include <execution> // 並列戦略用 (std::execution::par)

void Reduce::ParallelDemo()
{

    // 十分な大きさのデータセットを作成する
    const size_t dataSize = 100'000'000; // 1億要素
    std::vector<double> large_vec(dataSize);
    // ベクトルを単純な値で埋める
    std::fill(std::execution::par, large_vec.begin(), large_vec.end(), 0.12);

    std::cout << "Comparing Performance on " << dataSize << " elements " << std::endl;

    // std::accumulate（厳密に順次実行）とタイマー
    auto startAcc = std::chrono::high_resolution_clock::now();
    double sumAcc = std::accumulate(large_vec.begin(), large_vec.end(), 0.0);
    auto endAcc = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> timeAcc = endAcc - startAcc;

    std::cout << "std::accumulate (sequential) took: " << timeAcc.count() << " ms." << std::endl;

    // std::reduce (並列実行) タイミング付き
    auto startReduce = std::chrono::high_resolution_clock::now();
    // 最初の引数 std::execution::par は、reduce に並列戦略を使用するように指示します。
    double sumReduce = std::reduce(std::execution::par, large_vec.begin(), large_vec.end(), 0.0);
    auto endReduce = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> timeReduce = endReduce - startReduce;

    std::cout << "std::reduce (parallel)       took: " << timeReduce.count() << " ms." << std::endl;

    // 結果を出力します
    std::cout << "Accumulate result: " << sumAcc << std::endl;
    std::cout << "Reduce result:     " << sumReduce << std::endl;
}
```

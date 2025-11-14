---
title: c++ reduce 用法
published: 2025-11-15
updated: 2025-11-15
description: std::reduce 是 C++ 17 引入的算法，使用方式和 std::accumulate 类似，位于<numeric> 头文件中 ，它用于计算一个范围（如数组或容器）中元素的“广义求和”，类似于将所有元素逐步合并成一个结果。默认使用加法，但可自定义操作（如乘法）。其核心优势是支持并行执行，适用于大规模数据，提高效率。
tags:
  - cpp                              
toc: true
lang: zh
abbrlink: cpp-reduce
---

## reduce 介绍

std::reduce 是 C++ 17 引入的算法，使用方式和 std::accumulate 类似，位于`<numeric>`头文件中 ，它用于计算一个范围（如数组或容器）中元素的“广义求和”，类似于将所有元素逐步合并成一个结果。**默认使用加法**，但可自定义操作（如乘法）。其核心优势是**支持并行执行**，适用于大规模数据，提高效率。

### 用法

#### 无需默认值的求和

在 reduce 中，只需要传入容器的 begin 和 end 迭代器，不需要默认值即可进行求和。

```cpp
void Reduce::Demo()
{
    // 最简单的例子，reduce 用来计算数组元素的和
    // reduce 可以无默认值
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    int sum = std::reduce(vec.begin(), vec.end());
    std::cout << "Reduce Sum: " << sum << std::endl;

    // 用 accumulate 计算数组元素的和
    int accSum = std::accumulate(vec.begin(), vec.end(), 0);
    std::cout << "Accumulate Sum: " << accSum << std::endl;

    /*
    Reduce Sum: 15
    Accumulate Sum: 15
    */
}
```

#### 默认值对结果类型强转

reduce 和 accumulate 都可以通过默认值来对最终的结果进行类型修改。比如我需要将一个整型容器中所有的元素求和，但是给定的一个初始值 init 为 double 类型，这样所有的结果求和完之后就是 double 类型。

```cpp
void Reduce::DemoWithInit()
{
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    auto sum = std::reduce(vec.begin(), vec.end(), 0.0);
    std::cout << "Reduce Sum: " << sum << std::endl;

    auto accSum = std::accumulate(vec.begin(), vec.end(), 0.0);
    std::cout << "Accumulate Sum: " << accSum << std::endl;

    // --- 类型校验 ---
    // 使用 static_assert 在编译时验证 sum 和 accSum 的类型是否为 double
    static_assert(std::is_same_v<decltype(sum), double>, "Type of 'sum' should be double");
    static_assert(std::is_same_v<decltype(accSum), double>, "Type of 'accSum' should be double");

    std::cout << "Type verification passed at compile time." << std::endl;
}
```

#### 自定义操作符

通过 lambda 表达式或者 function 中的操作符函数进行自定义操作运算。

```cpp
void Reduce::CustomOp()
{
    // 方式一：通过 lambda 表达式自定义操作，完成累乘操作
    std::vector<int> vec = { 1, 2, 3, 4, 5 };
    int res = std::reduce(vec.begin(), vec.end(), 1, [](int a, int b) {
        return a * b;
    });
    std::cout << "Custom Reduce Result: " << res << std::endl;

    res = std::accumulate(vec.begin(), vec.end(), 1, [](int a, int b) {
        return a * b;
    });
    std::cout << "Custom Accumulate Result: " << res << std::endl;

    // 方式二：通过 std::multiplies 进行自定义操作，完成累乘操作

    /*
    #include <functional>
    常见的操作符函数对象包括：
        std::plus<>         // 加法
        std::minus<>        // 减法
        std::multiplies<>   // 乘法
        std::divides<>      // 除法
        std::modulus<>      // 取模
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

### 特性

#### 并行计算

在 accumulate 算法中，只支持严格地顺序计算，但是在 reduce 中则不同。如果操作运算符合交换律和结合律（例如：a + (b + c) = (a + b) + c / a + b = b + a），在这种前提下，用 reduce 的并行计算即可完成结果准确的高效计算。但是需要注意的是并行计算在一些情况下会出现更慢的情况：

1. 编译器和标准库的实现
   MinGW-g++ 环境可能没有正确配置并行执行。默认情况下，g++ 的 C++17 并行算法可能需要链 接到特定的后端库，如 Intel's Threading Building Blocks (TBB)。如果没有链接这个库， `std::execution::par`  可能会被“降级”为顺序执行，但仍然带有并行的检查和准备开销，所以可能比正常的顺序执行更慢。

2. 硬件限制
   如果 CPU 只有 1-2 个核心，那么并行带来的好处非常有限。在双核 CPU 上，最多只能获得理论上 2 倍的加速，这很容易被并行开销所抵消。

3. 并行开销

-   **线程创建与管理**: 运行时系统需要启动一个线程池，并将计算任务分配给多个线程。创建、调度和销毁线程本身就需要时间。
-   **数据分区 (Data Partitioning)**: 必须将一亿个元素（以下方代码例子为例）的逻辑上分割成多个小块，每一块交给一个线程去处理。
-   **中间结果同步**: 每个线程计算出它那一小块的部分和后，还需要一个最终步骤，将所有线程计算出的部分和再次相加（reduce），得到最终的总和。这个合并步骤存在同步开销。

```cpp
#include <chrono> // 用于高精度计时
#include <execution> // 用于并行策略 (std::execution::par)

void Reduce::ParallelDemo()
{

    // 创建一个足够大的数据集
    const size_t dataSize = 100'000'000; // 一亿个元素
    std::vector<double> large_vec(dataSize);
    // 用简单的值填充向量
    std::fill(std::execution::par, large_vec.begin(), large_vec.end(), 0.12);

    std::cout << "Comparing Performance on " << dataSize << " elements " << std::endl;

    // std::accumulate (严格顺序执行) 并计时
    auto startAcc = std::chrono::high_resolution_clock::now();
    double sumAcc = std::accumulate(large_vec.begin(), large_vec.end(), 0.0);
    auto endAcc = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> timeAcc = endAcc - startAcc;

    std::cout << "std::accumulate (sequential) took: " << timeAcc.count() << " ms." << std::endl;

    // std::reduce (并行执行) 并计时
    auto startReduce = std::chrono::high_resolution_clock::now();
    // 第一个参数 std::execution::par 告诉 reduce 使用并行策略
    double sumReduce = std::reduce(std::execution::par, large_vec.begin(), large_vec.end(), 0.0);
    auto endReduce = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> timeReduce = endReduce - startReduce;

    std::cout << "std::reduce (parallel)       took: " << timeReduce.count() << " ms." << std::endl;

    // 打印结果
    std::cout << "Accumulate result: " << sumAcc << std::endl;
    std::cout << "Reduce result:     " << sumReduce << std::endl;
}
```

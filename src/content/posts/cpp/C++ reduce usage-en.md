---
title: c++ reduce usage
published: 2025-11-15
updated: 2025-11-15
description: std::reduce is an algorithm introduced in C++17, used similarly to std::accumulate, and located in the <numeric> header file. It is used to compute a "generalized sum" of elements in a range (such as an array or container), similar to progressively merging all elements into a single result. It uses addition by default, but custom operations (such as multiplication) can be defined. Its core advantage is its support for parallel execution, making it suitable for large-scale data and improving efficiency.
tags:
  - cpp
toc: true
lang: en
abbrlink: cpp-reduce
---

## Introduction to `reduce`

`std::reduce` is an algorithm introduced in C++17. Its usage is similar to `std::accumulate`, located in the `<numeric>` header file. It's used to calculate the "generalized summation" of elements within a range (such as an array or container), similar to progressively merging all elements into a single result. **It uses addition by default**, but custom operations (such as multiplication) can be defined. Its core advantage is **support for parallel execution**, making it suitable for large-scale data and improving efficiency.

### Usage

#### Summation without Default Values

In `reduce`, you only need to pass in the container's `begin` and `end` iterators; default values ​​are not required for summation.

```cpp

void Reduce::Demo()

{
	// The simplest example, reduce is used to calculate the sum of array elements
	// reduce can have no default value
	std::vector<int> vec = { 1, 2, 3, 4, 5 };
	int sum = std::reduce(vec.begin(), vec.end());
	std::cout << "Reduce Sum: " << sum << std::endl;
	// Use accumulate to calculate the sum of array elements
	int accSum = std::accumulate(vec.begin(), vec.end(), 0);
	std::cout << "Accumulate Sum: " << accSum << std::endl;
	/*
	Reduce Sum: 15
	Accumulate Sum: 15
	*/
}
```

#### Default values ​​can be used to cast the result type.

Both `reduce` and `accumulate` can use default values ​​to modify the type of the final result. For example, if I need to sum all the elements in an integer container, but the given initial value `init` is of type `double`, then the sum of all elements will be of type `double`.

```cpp

void Reduce::DemoWithInit()

{
	std::vector<int> vec = { 1, 2, 3, 4, 5 };
	auto sum = std::reduce(vec.begin(), vec.end(), 0.0);
	std::cout << "Reduce Sum: " << sum << std::endl;
	auto accSum = std::accumulate(vec.begin(), vec.end(), 0.0);
	std::cout << "Accumulate Sum: " << accSum << std::endl;
	// --- Type validation ---
	// Use static_assert to verify at compile time whether sum and accSum are of type double
	static_assert(std::is_same_v<decltype(sum), double>, "Type of 'sum' should be `double");
	static_assert(std::is_same_v<decltype(accSum), double>, "Type of 'accSum' should be double");
	std::cout << "Type verification passed at compile time." << std::endl;
}
```

#### Custom Operators

Custom operations can be performed using lambda expressions or operator functions within functions.

```cpp

void Reduce::CustomOp()

{
	// Method 1: Customize the operation using lambda expressions to complete the cumulative multiplication operation
	std::vector<int> vec = { 1, 2, 3, 4, 5 };
	int res = std::reduce(vec.begin(), vec.end(), 1, [](int a, int b) {
	return a * b;
	});
	std::cout << "Custom Reduce Result: " << res << std::endl;
	res = std::accumulate(vec.begin(), vec.end(), 1, [](int a, int b) {
	return a * b;
	});
	std::cout << "Custom Accumulate Result: " << res << std::endl;
	// Method 2: Using std::multiplies` Perform custom operations to complete the cumulative multiplication operation.

	/*
	#include <functional>
	Common operator function objects include:
	std::plus<> // Addition
	std::minus<> // Subtraction
	std::multiplies<> // Multiplication
	std::divides<> // Division
	std::modulus<> // Modulus
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

### Features

#### Parallel Computation

In the accumulate algorithm, only strictly sequential computation is supported, but this is different in reduce. If the operators are commutative and associative (e.g., a + (b + c) = (a + b) + c / a + b = b + a), then parallel computation of reduce can achieve accurate and efficient computation. However, it should be noted that parallel computation can be slower in some cases:

1. Compiler and Standard Library Implementation

The MinGW-g++ environment may not be correctly configured for parallel execution. By default, g++'s C++17 parallel algorithms may require linking to a specific backend library, such as Intel's Threading Building Blocks (TBB). Without this link, `std::execution::par` might be "degraded" to sequential execution, but still incurs the overhead of parallel checks and preparation, potentially making it slower than normal sequential execution.

2. Hardware Limitations

If the CPU has only 1-2 cores, the benefits of parallelism are very limited. On a dual-core CPU, the maximum theoretical speedup is only 2x, which is easily offset by the parallel overhead.

3. Parallel Overhead

- **Thread Creation and Management**: The runtime system needs to start a thread pool and distribute computational tasks to multiple threads. Creating, scheduling, and destroying threads themselves takes time.

- **Data Partitioning**: One hundred million elements (as shown in the code example below) must be logically divided into multiple smaller blocks, each assigned to a thread for processing.

- **Intermediate Result Synchronization:** After each thread calculates its partial sum, a final step is needed to sum (reduce) the partial sums calculated by all threads to obtain the final total. This merging step incurs synchronization overhead.

```cpp

#include <chrono> // For high-precision timing
#include <execution> // For parallel strategies (std::execution::par)
void Reduce::ParallelDemo()
{
	// Create a sufficiently large dataset
	const size_t dataSize = 100'000'000; // One hundred million elements
	std::vector<double> large_vec(dataSize);

	// Fill the vector with simple values
	std::fill(std::execution::par, large_vec.begin(), large_vec.end(), 0.12);
	std::cout << "Comparing Performance on " << dataSize << " elements " << std::endl;
	// std::accumulate (strict sequential execution) and time
	auto startAcc = std::chrono::high_resolution_clock::now();
	double sumAcc = std::accumulate(large_vec.begin(), large_vec.end(), 0.0);
	auto endAcc = std::chrono::high_resolution_clock::now();
	std::chrono::duration<double, std::milli> timeAcc = endAcc - startAcc;
	std::cout << "std::accumulate (sequential) took: " << timeAcc.count() << " ms." << std::endl;

	// std::reduce (parallel execution) and timing
	auto startReduce = std::chrono::high_resolution_clock::now();

	// The first parameter std::execution::par tells reduce to use a parallel strategy
	double sumReduce = std::reduce(std::execution::par, large_vec.begin(), large_vec.end(), 0.0);
	auto endReduce = std::chrono::high_resolution_clock::now();
	std::chrono::duration<double, std::milli> timeReduce = endReduce - startReduce;
	std::cout << "std::reduce (parallel) took: " << timeReduce.count() << " ms." << std::endl;

	// print results
	std::cout << "Accumulate result: " << sumAcc << std::endl;
	std::cout << "Reduce result: " << sumReduce << std::endl;
}
```

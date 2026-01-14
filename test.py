def calculate_average(numbers):
    if not numbers:
        return 0
    total = sum(numbers)
    count = len(numbers)
    return total / count

result = calculate_average([10, 20, 30, 40])
print(f"평균: {result}")

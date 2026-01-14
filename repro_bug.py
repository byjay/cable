from test import calculate_average

try:
    print("Testing empty list...")
    calculate_average([])
except ZeroDivisionError:
    print("Caught expected ZeroDivisionError")
except Exception as e:
    print(f"Caught unexpected exception: {e}")

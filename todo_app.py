# Simple TODO App for testing

todos = []

def add_todo(item):
    todos.append(item)
    print(f"Added: {item}")

def list_todos():
    print("TODO List:")
    for i, item in enumerate(todos):
        print(f"{i+1}. {item}")

def main():
    add_todo("Buy milk")
    add_todo("Walk the dog")
    list_todos()

if __name__ == "__main__":
    main()

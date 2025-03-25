## Nuxt with TypeScript Copilot Instructions

1. **Use Composition API exclusively**
   Always use the Composition API style for components and composables.

    ```typescript
    // Correct
    export default defineComponent({
        setup() {
            const count = ref(0);
            return { count };
        },
    });

    // Incorrect
    export default {
        data() {
            return {
                count: 0,
            };
        },
    };
    ```

2. **Function declarations for methods**
   Use function declarations instead of arrow function assignments for methods.

    ```typescript
    // Correct
    func increment() {
      count.value++
    }

    // Incorrect
    const increment = () => {
      count.value++
    }
    ```

3. **Avoid using 'any' type**
   Never use the 'any' type. Instead, use more specific types or 'unknown' if the type is truly unknown.

    ```typescript
    // Correct
    func processData(data: unknown) {
      // Type-check and narrow the type before using
    }

    // Incorrect
    func processData(data: any) {
      // This bypasses type checking
    }
    ```

4. **Use non-null refs**
   When using refs, initialize them with a value instead of null.

    ```typescript
    // Correct
    const name = ref('');

    // Incorrect
    const name = ref(null);
    ```

5. **Prefer undefined over null**
   Use undefined instead of null when representing the absence of a value.

    ```typescript
    // Correct
    const user = ref(undefined);

    // Incorrect
    const user = ref(null);
    ```

6. **Type inference**
   Leverage TypeScript's type inference when possible, but provide explicit types for function parameters and return types.

    ```typescript
    // Correct
    func calculateTotal(items: Item[]): number {
      return items.reduce((total, item) => total + item.price, 0)
    }

    // Incorrect (missing return type)
    func calculateTotal(items: Item[]) {
      return items.reduce((total, item) => total + item.price, 0)
    }
    ```

7. **Use TypeScript features**
   Utilize TypeScript features like interfaces, type aliases, and generics to create more robust and reusable code.

    ```typescript
    interface User {
      id: number
      name: string
      email: string
    }

    type UserWithoutId = Omit

    func createUser(user: UserWithoutId): User {
      return { ...user, id: generateId() }
    }
    ```

8. **Async/Await**
   Use async/await for asynchronous operations instead of promise chains.

    ```typescript
    // Correct
    async func fetchUserData(userId: number): Promise {
      const response = await fetch(`/api/users/${userId}`);
      return await response.json();
    }

    // Incorrect
    func fetchUserData(userId: number): Promise {
      return fetch(`/api/users/${userId}`)
        .then(response => response.json())
    }
    ```

9. **Always use semicolons**
   Always terminate statements with semicolons for clarity and consistency.

    ```typescript
    // Correct
    const name = ref('');
    func increment(): void {
      count.value++;
    }

    // Incorrect
    const name = ref('')
    func increment(): void {
      count.value++
    }
    ```

Remember to adhere to these guidelines while coding to maintain consistency and leverage the full power of TypeScript in your Nuxt project.
Always add comments to your code.

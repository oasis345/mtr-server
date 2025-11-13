---
적용: 항상
---

You are a senior TypeScript programmer with experience in the NestJS framework and a preference for clean programming
and design patterns.

Generate code, corrections, and refactorings that comply with the basic principles and nomenclature.

## TypeScript General Guidelines

### Basic Principles

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
  - Avoid using any.
  - Create necessary types.
- Use JSDoc to document public classes and methods.
- Don't leave blank lines within a function.
- One export per file.

### Nomenclature

- Use PascalCase for classes.
- Use camelCase for variables, functions, and methods.
- Use kebab-case for file and directory names.
- Use UPPERCASE for environment variables.
  - Avoid magic numbers and define constants.
- Start each function with a verb.
- Use verbs for boolean variables. Example: isLoading, hasError, canDelete, etc.
- Use complete words instead of abbreviations and correct spelling.
  - Except for standard abbreviations like API, URL, etc.
  - Except for well-known abbreviations:
    - i, j for loops
    - err for errors
    - ctx for contexts
    - req, res, next for middleware function parameters

### Functions

- In this context, what is understood as a function will also apply to a method.
- Write short functions with a single purpose. Less than 20 instructions.
- Name functions with a verb and something else.
  - If it returns a boolean, use isX or hasX, canX, etc.
  - If it doesn't return anything, use executeX or saveX, etc.
- Avoid nesting blocks by:
  - Early checks and returns.
  - Extraction to utility functions.
- Use higher-order functions (map, filter, reduce, etc.) to avoid function nesting.
  - Use arrow functions for simple functions (less than 3 instructions).
  - Use named functions for non-simple functions.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters using RO-RO
  - Use an object to pass multiple parameters.
  - Use an object to return results.
  - Declare necessary types for input arguments and output.
- Use a single level of abstraction.

### Data

- Don't abuse primitive types and encapsulate data in composite types.
- Avoid data validations in functions and use classes with internal validation.
- Prefer immutability for data.
  - Use readonly for data that doesn't change.
  - Use as const for literals that don't change.

### Classes

- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose.
  - Less than 200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.

### Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context.
  - Otherwise, use a global handler.

### Testing

- Follow the Arrange-Act-Assert convention for tests.
- Name test variables clearly.
  - Follow the convention: inputX, mockX, actualX, expectedX, etc.
- Write unit tests for each public function.
  - Use test doubles to simulate dependencies.
    - Except for third-party dependencies that are not expensive to execute.
- Write acceptance tests for each module.
  - Follow the Given-When-Then convention.

## Specific to NestJS

### Basic Principles

- Use modular architecture
- Encapsulate the API in modules.
  - One module per main domain/route.
  - One controller for its route.
    - And other controllers for secondary routes.
  - A models folder with data types.

    ## TypeScript & NestJS conventions (project)
    - Use English for code and docs. Declare explicit types (avoid any). One export per file.
    - Naming: PascalCase for classes, camelCase for functions/variables, kebab-case for filenames.
    - DTOs: use `class-validator` and `class-transformer` for input validation and `ValidationPipe` is enabled globally
      (`src/main.ts`).

    ## Core Architectural Principle: The Clean Architecture
    - This project follows the principles of The Clean Architecture. The core rule is the **Dependency Rule**: source
      code dependencies must always point inwards.
    - **Entities (Center):** Core business data structures, like Prisma models. They are independent of application
      logic.
    - **Use Cases (Application Logic):** Application-specific business rules. In this project, these are implemented
      within NestJS **Services** (e.g., `StockService`, `CryptoService`). They orchestrate the flow of data using
      Entities.
    - **Interface Adapters:** This layer adapts data for external agents. It includes:
      - **Controllers:** Handle web requests and translate them into use case inputs.
      - **Gateways:** Abstract external dependencies. The `ProviderRegistry` is a prime example, acting as a gateway to
        various financial data providers.
      - **Presenters:** Transform use case output for the UI/client (often handled by NestJS serialization and DTOs).
    - **Frameworks & Drivers (Outermost Layer):** Details like the NestJS framework itself, Prisma (for DB), Redis, and
      external APIs. This layer is volatile and depends on the inner layers, not the other way around.

    ## Repository-specific guidance (mtr-server)
    - Big picture: a NestJS monolith focused on financial/market data. Major modules:
      - `src/financial` — asset providers, orchestration, caching, `ProviderRegistry` pattern.
      - `src/gateway/market` — websocket gateway and subscriptions.
      - `src/database` — `PrismaService` handles DB lifecycle and shutdown hooks.
      - `src/cache` — global Redis cache wrapped by `AppCacheService`.
      - `src/auth` / `src/user` — auth and user features.

    - Key patterns and examples to follow:
      - Provider registry: implement `FinancialProvider` and register with `FINANCIAL_PROVIDERS` token (see
        `src/financial/providers/financial.provider.ts` and `src/financial/providers/provider.registry.ts`).
      - Async factory initialization: use `useFactory` providers when services require async init (see
        `StockService`/`CryptoService` registration in `src/financial/financial.module.ts`).
      - Centralized HTTP client: use `src/common/http/http.module.ts` (CustomHttpModule) for external API calls.
      - Cache usage: call `AppCacheService.get/set/del`; logs include `HIT/MISS/SET/DEL` (see
        `src/cache/cache.service.ts`).
      - DB lifecycle: call `enableShutdownHooks()` from `PrismaService` in `src/main.ts` to ensure graceful shutdown.

    - Run & build (from `package.json`):
      - install: `npm install`
      - dev: `npm run start:dev`
      - build: `npm run build` then `npm run start:prod`
      - tests: `npm run test`, e2e: `npm run test:e2e`

    - Environment & config: prefer `ConfigService` when available. Process env keys used include `DATABASE_URL`,
      `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `CORS_ORIGIN`, `PORT`.

    - When generating code:
      - Mirror file layout and naming used in `src/financial` and `src/cache`.
      - Expose DTOs under a `dtos` folder and validate inputs with decorators.
      - Use the `ProviderRegistry.call(assetType, dataType, params)` pattern to invoke provider methods instead of
        direct conditional dispatch.

    - Tests: unit tests live with source under `src` using Jest config in `package.json`; e2e helpers are under `test/`.

    If you'd like, I can:
    - add a module/controller/service template file in `src/` you can use as a starter, or
    - produce a short checklist for code reviews that enforces these patterns.

    Please tell me which of the above you'd like expanded or if any repository detail is missing.

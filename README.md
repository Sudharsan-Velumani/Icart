# icart

A shopping cart application built with **Astro.js** and **TypeScript**, following **Domain-Driven Design** and developed **test-first**, containerized with **Docker**.

Built as part of a technical assessment. The brief asked for Product Management and Shopping Cart REST APIs, a UI for one of the two — this project delivers both, plus a full authentication layer (admin and customer) as an extension beyond the minimum scope.

## Live features

- **Product Management** — full CRUD REST API, admin-only for mutations, public for browsing
- **Shopping Cart** — add / remove / view / update quantity, tied to the logged-in customer's session
- **Admin panel** — login-gated product management UI (add/edit/delete, with image support)
- **Storefront** — customer signup/login, product browsing, and a live shopping cart UI
- **Authentication** — separate admin and customer login systems, session-based, bcrypt-hashed passwords

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Astro.js](https://astro.build) (server output, Node adapter) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL ([Neon](https://neon.tech) serverless Postgres) |
| DB driver | [`pg`](https://node-postgres.com) (raw SQL, no ORM) |
| Sessions | Astro Sessions (Redis-backed in production, filesystem in dev) |
| Auth | Cookie-based sessions + `bcryptjs` |
| Testing | [Vitest](https://vitest.dev) |
| Containerization | Docker (multi-stage build) |

No ORM is used deliberately — the repository pattern (see Architecture below) keeps persistence logic isolated behind interfaces defined in the domain layer, so raw SQL is easy to reason about and doesn't leak into business logic.

## Architecture: Domain-Driven Design

```
src/
  domain/                      # Enterprise business rules — zero framework imports
    product/
      Product.ts                # Aggregate root: enforces all product invariants
      ProductRepository.ts      # Port (interface) for persistence
      errors.ts
    cart/
      Cart.ts                   # Aggregate root: owns CartItems, enforces stock rules
      CartItem.ts                # Value object (immutable line item)
      CartRepository.ts
      errors.ts
    user/
      User.ts                   # Customer profile entity (never holds credentials)
      UserRepository.ts
      errors.ts
    auth/
      AdminUserRepository.ts
      errors.ts                 # Shared InvalidCredentialsError (admin + customer)
    shared/
      errors.ts                 # Base DomainError

  application/                  # Use cases: orchestrate domain + ports, no HTTP concerns
    product/                    # AddProduct, UpdateProduct, DeleteProduct, GetProduct, ListProducts
    cart/                       # AddItemToCart, RemoveItemFromCart, UpdateItemQuantity, GetCart
    user/                       # Signup, UserLogin
    auth/                       # AdminLogin, PasswordHasher (port)

  infrastructure/                # Adapters: implementations of the domain ports
    repositories/                 # Postgres-backed repository implementations
    auth/                         # bcrypt PasswordHasher adapter
    http/                         # Error-to-HTTP-status mapping, auth guards, DTOs
    db/pool.ts                    # Lazy Postgres connection pool
    productContainer.ts           # Composition root: product bounded context
    cartContainer.ts              # Composition root: cart bounded context
    authContainer.ts               # Composition root: auth bounded context

  pages/                         # Astro routes — presentation layer only, no business logic
    index.astro                   # Public landing page
    admin/                        # Admin login + product management UI
    shop/                         # Customer signup/login, product browsing, cart UI
    api/                          # REST API routes (see API Reference below)

  middleware.ts                  # Route guards for /admin/* and /shop/* pages

tests/
  unit/                          # Domain + application layer, no I/O
    domain/                      # Pure entity/value-object tests
    application/                 # Use case tests against in-memory repositories
  integration/                   # Full HTTP-route tests (request in, JSON response out)
    api/                         # Product, Cart, and Auth API route tests
```

**Why this layering?**

- **Domain** objects (`Product`, `Cart`, `User`) are plain TypeScript classes that protect their own invariants — a `Product` can never have a negative price, a `Cart` can never exceed a product's stock. This is DDD's core idea: business rules live in the domain, not scattered across route handlers.
- **Application** (use cases) coordinates domain objects and repository ports. Each use case does exactly one thing (`AddItemToCartUseCase`, `DeleteProductUseCase`, etc.) and is fully unit-testable without touching a database.
- **Infrastructure** implements the ports the domain/application layers depend on, and adapts HTTP concerns (JSON parsing, error-to-status-code mapping) so routes stay thin.
- **Presentation** (`src/pages`) is Astro-specific glue only — it wires requests to use cases via composition roots and serializes results. It contains no business logic.

This means the domain and application layers could power a CLI or a different framework entirely without modification — only the presentation layer would change.

## Design decisions worth knowing

- **Repository pattern over an ORM.** Swapping Postgres for another datastore means writing one new adapter class per repository interface — zero changes to domain or application code.
- **Cart price is snapshotted at add-time.** `CartItem.unitPrice` is captured when an item is added, not looked up live. If a product's price changes while it's sitting in a cart, the cart doesn't silently reprice — this mirrors how real e-commerce carts behave.
- **Stock is re-validated on every cart mutation**, using the current product state, so a cart can never oversell inventory even if stock changed after the item was first added.
- **No user enumeration on login.** Both admin and customer login return the identical error for "wrong password" and "email doesn't exist," so a failed login attempt never reveals whether an account exists.
- **Image URLs are validated server-side** (`http://`/`https://` prefix required) to prevent `javascript:` URI injection through a field that ends up in an `src` attribute.
- **Cart and user data are isolated per session.** The cart API always operates on the *session's* user id, never a client-supplied one, so no user can read or modify another user's cart by guessing an ID.
- **Sessions use Redis in production, filesystem in dev.** Astro's session driver switches automatically based on environment — no Redis setup needed for local development, and no shared-state issues in a serverless/containerized production deployment.

## Getting started

### Prerequisites
- Node.js 22.12+
- A PostgreSQL database (this project was built against [Neon](https://neon.tech)'s free tier serverless Postgres)
- A Redis instance for production/Docker builds (e.g. [Redis Cloud](https://redis.io/cloud) free tier) — not required for local `npm run dev`

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example file and fill in your real database and Redis connection strings:
```bash
cp .env.example .env
```
```
DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
REDIS_URL=redis://<user>:<password>@<host>:<port>
```

`REDIS_URL` is only required for `astro build` / production runs (used for session storage). Local `npm run dev` doesn't need it — sessions fall back to a filesystem driver in development, so Redis has zero setup cost for local dev.

### 3. Set up the database schema
Run this SQL against your database (e.g. via Neon's SQL Editor):

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description VARCHAR(2000) NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
```

### 4. Create an admin account
There's no self-signup for admins by design. Seed one via the CLI script:
```bash
npm run seed:admin -- admin@icart.com YourStrongPassword123
```
Safe to re-run — it upserts, so re-running with a new password rotates the existing admin's password.

### 5. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:4321`.

## Testing

```bash
npm test               # run the full suite
npm run test:unit       # domain + application layers only
npm run test:integration  # API route tests only
npm run test:coverage   # with a coverage report
```

**118 tests across 10 files:**

| Layer | What's covered |
|---|---|
| Domain unit tests | `Product`, `Cart`/`CartItem`, `User` — every invariant, validation rule, and edge case |
| Application unit tests | All 11 use cases (Product, Cart, Admin login, Signup, Customer login) — happy paths and every documented error path, using in-memory repository test doubles |
| Integration tests | Actual Astro API route handlers (`GET`/`POST`/`PUT`/`DELETE`), called with real `Request` objects and asserted on status code + JSON body. Postgres is swapped for an in-memory repository via module mocking, but the route code, use cases, and domain logic under test are the unmodified production code. |

Notable behaviors specifically covered: cart isolation between users, no-user-enumeration on failed login, stock never oversold, price snapshotting, and admin-only auth guards on mutating endpoints (verified both with and without a session).

## API reference

All endpoints return JSON. Errors return `{ "error": "<ErrorClassName>", "message": "..." }` with an appropriate status code.

### Product Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List all products |
| GET | `/api/products/:id` | Public | Fetch one product |
| POST | `/api/products` | Admin | Create a product |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |

`GET` is public since customers browsing the storefront need it too — only mutations require an admin session.

### Shopping Cart

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | Customer | View the current user's cart |
| POST | `/api/cart/items` | Customer | Add an item to the cart |
| PUT | `/api/cart/items/:productId` | Customer | Set an item's quantity |
| DELETE | `/api/cart/items/:productId` | Customer | Remove an item |

The cart always operates on the authenticated session's user — there is no way to view or modify another user's cart.

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/auth/login` | Admin login |
| POST | `/api/admin/auth/logout` | Admin logout |
| POST | `/api/shop/auth/signup` | Customer signup |
| POST | `/api/shop/auth/login` | Customer login |
| POST | `/api/shop/auth/logout` | Customer logout |

| Error class | HTTP status |
|---|---|
| `InvalidProductError`, `InvalidCartOperationError`, `InvalidUserRegistrationError` | 400 |
| `InvalidCredentialsError` | 401 |
| `ProductNotFoundError`, `CartItemNotFoundError` | 404 |
| `EmailAlreadyRegisteredError`, `InsufficientStockError` | 409 |
| Unexpected errors | 500 |

## Docker

```bash
docker compose up --build
```
Requires a `.env` file in the project root with real `DATABASE_URL` and `REDIS_URL` values (see [Configure environment variables](#2-configure-environment-variables) above). Docker Compose reads `.env` via `env_file` at runtime, and `REDIS_URL` is additionally passed in as a build argument since Astro's session driver is configured at build time. Visit `http://localhost:4321`.

The image is a multi-stage build: dependencies + `astro build` in a build stage, then only the compiled `dist/` output and production dependencies in a slim runtime stage. The build stage uses the `@astrojs/node` adapter (standalone mode) so the container runs independently of Vercel; the same `astro.config.mjs` still targets `@astrojs/vercel` for actual Vercel deployments, switched automatically via a `DOCKER_BUILD` build-time flag.

## Project structure summary

```
icart/
├── src/
│   ├── domain/            # Business rules (framework-free)
│   ├── application/       # Use cases
│   ├── infrastructure/    # Postgres adapters, HTTP helpers, composition roots
│   ├── pages/              # Astro routes (UI + API)
│   └── middleware.ts       # Auth route guards
├── tests/
│   ├── unit/               # Domain + application layer tests
│   └── integration/        # API route tests
├── scripts/
│   └── seedAdmin.ts         # CLI to create/reset the admin account
├── Dockerfile
├── docker-compose.yml
├── vitest.config.ts
└── astro.config.mjs
```

## License

Built for a technical assessment. Not licensed for production use as-is.
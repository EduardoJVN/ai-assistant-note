# TypeScript Hexagonal Architecture Template 🚀

Este es un template base para Node.js (v24+) diseñado bajo los principios de **Arquitectura Hexagonal** y **Domain-Driven Design (DDD)**. Está optimizado para ser escalable, testeable y listo para producción.

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js 24 (ESM Nativo)
- **Lenguaje:** TypeScript 5.x
- **Bundler:** esbuild (con soporte para Aliases)
- **Linter & Formatter:** ESLint 10 + Prettier
- **Testing:** Vitest (Unit & Integration)
- **Logger:** Pino (Estructurado y de alto rendimiento)
- **CI/CD:** GitHub Actions
- **Git Hooks:** Husky + lint-staged + commitlint (Conventional Commits)

---

## 🏗️ Arquitectura y Estructura

El proyecto utiliza un enfoque de **Vertical Slicing** dentro de las capas de Clean Architecture para facilitar la escalabilidad y el desacoplamiento.



```text
src/
├── domain/                # Capa 1: Lógica de negocio pura (Entidades y Reglas)
│   ├── {module}/          # Módulos de negocio (ej: user, task)
│   │   ├── entities/      # Objetos de dominio
│   │   └── ports/         # Interfaces (Repositories, Services)
│   └── shared/            # Interfaces transversales (ILogger, IEventBus)
├── application/           # Capa 2: Casos de Uso (Orquestación)
│   └── {module}/          # Lógica de flujo por módulo
├── infrastructure/        # Capa 3: Implementaciones técnicas (Mundo exterior)
│   ├── adapters/          # Implementaciones de los ports (DB, Email, Pino)
│   ├── entry-points/      # Controladores (Express, Fastify, CLI)
│   └── config/            # Configuraciones de infraestructura
├── shared/                # Utilidades y código común transversal
└── main.ts                # Composición y arranque de la aplicación (Bootstrap)
```

---

## 🚦 Automatización y Calidad (Git Hooks)

Este repositorio utiliza **Husky** y **lint-staged** para garantizar que ningún código "roto" llegue al repositorio:

- **Pre-commit:** Se ejecuta automáticamente `eslint --fix`, `prettier --write` y los tests relacionados con los archivos modificados.
- **Commit-msg:** Valida que los mensajes sigan el estándar de **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.).

---

## 🤖 CI/CD Pipelines

Configurado con **GitHub Actions**:
1. **MR Check (`mr.yml`)**: Valida Lint, Tests y Build en cada Pull Request hacia cualquier rama.
2. **Main Guard (`main.yml`)**: Validación final de integridad al fusionar en la rama `main`.

---

## 🚀 Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `yarn install` | Instala dependencias y configura los Git Hooks. |
| `yarn dev` | Levanta el proyecto en modo desarrollo con hot-reload. |
| `yarn build` | Genera el bundle de producción en `/dist` usando esbuild. |
| `yarn lint` | Ejecuta el linter y corrige errores automáticos. |
| `yarn test` | Ejecuta la suite de pruebas con Vitest. |
| `yarn test:coverage` | Genera un reporte detallado de cobertura de código. |

---

## 🔗 Alias de Rutas

Para evitar los "relative imports hell" (`../../../`), puedes usar los siguientes alias:
- `@domain/*` -> `src/domain/*`
- `@application/*` -> `src/application/*`
- `@infra/*` -> `src/infrastructure/*`
- `@shared/*` -> `src/shared/*`

---

## 💡 Mejores Prácticas Incluidas
1. **Inyección de Dependencias:** El Logger y los Repositorios se pasan vía constructor para facilitar el Mocking en tests.
2. **Logs Transversales:** Implementación de `ILogger` en dominio para logging desacoplado.
3. **Manejo de Errores:** Estructura preparada para excepciones de dominio personalizadas.

---
# 🤖 AI Agents & Automation Logic

Este documento describe cómo integrar Agentes de IA y servicios de automatización dentro de la Arquitectura Hexagonal de este template.

---

## 🏗️ Ubicación en la Arquitectura

Para mantener el desacoplamiento, los agentes se distribuyen siguiendo la regla de dependencia:

### 1. Capa de Dominio (`src/domain/ai`)
Aquí definimos **qué** puede hacer el agente, sin importar qué modelo (OpenAI, Claude, Local LLM) se use.
- **Ports:** Interfaces como `IAgentProvider`, `IPromptRepository`.
- **Entities:** Definición de `AgentResponse`, `ConversationContext`.

### 2. Capa de Aplicación (`src/application/ai`)
Aquí reside la **orquestación** del agente.
- **Use Cases:** `ProcessNaturalLanguageCommand`, `GenerateReportWithAI`.
- Los casos de uso reciben los *Ports* e interactúan con los modelos de negocio.

### 3. Capa de Infraestructura (`src/infrastructure/adapters/ai`)
Aquí implementamos la tecnología específica.
- **Adapters:** `OpenAIAgentAdapter`, `LangChainWrapper`.
- Es la única capa que conoce las API Keys y los SDKs de terceros.

---

## 🛠️ Flujo de Trabajo de un Agente



1. **Input:** Un `entry-point` (ej. una ruta de Express) recibe un prompt.
2. **Orquestación:** El Caso de Uso de la capa de **Application** solicita al **Domain** las reglas de validación.
3. **Ejecución:** Se llama al adaptador en **Infrastructure** para comunicarse con el modelo de IA.
4. **Logging:** Todo el proceso se traza utilizando el `ILogger` inyectado.

---

## 📋 Estándares para Agentes

| Requisito | Descripción |
| :--- | :--- |
| **Stateless** | Los agentes deben ser sin estado siempre que sea posible; el contexto se pasa en el DTO. |
| **Timeout Guard** | Todo llamado a un agente externo debe incluir un límite de tiempo en infraestructura. |
| **Mocking** | Debido al costo y latencia, todos los agentes deben tener un `MockAgentAdapter` para tests. |
| **Observabilidad** | Los prompts y respuestas deben loguearse (anonimizados) para auditoría. |

---

## 🚀 Ejemplo de Inyección

```typescript
// En Application
constructor(
  private readonly agent: IAgentProvider,
  private readonly logger: ILogger
) {}

async execute(input: string) {
  this.logger.info("Agente iniciando proceso...");
  return await this.agent.complete(input);
}
```
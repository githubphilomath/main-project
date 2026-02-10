# Design Decisions

This document explains key architectural and design decisions made in building the Multi-Agent Autonomous Software Development Platform.

## Architecture Overview

### Why LangGraph?

LangGraph was chosen as the orchestration framework because:
- **State Management**: Provides robust state management across agent transitions
- **Workflow Control**: Enables complex conditional routing and error recovery
- **Observability**: Built-in support for streaming and monitoring agent execution
- **Extensibility**: Easy to add new agents or modify workflow without major refactoring

### Why TypedDict for State?

The `AgentState` uses `TypedDict` instead of Pydantic models because:
- **JSON Compatibility**: LangGraph requires JSON-serializable state
- **Performance**: TypedDict is lighter weight than Pydantic for state passing
- **Flexibility**: Allows dynamic state updates without strict validation overhead
- **Compatibility**: Works seamlessly with LangGraph's state management

However, we use Pydantic models (`CodeArtifact`, `TestArtifact`, etc.) for structured data that needs validation, then convert them to dicts for state storage.

## Agent Design

### Base Agent Pattern

All agents inherit from `BaseAgent` which provides:
- **LLM Integration**: Centralized Gemini LLM client with retry logic
- **RAG Access**: Direct access to all three RAG systems
- **Common Utilities**: Decision creation, memory storage, state updates
- **Error Handling**: Consistent error handling across agents

### Agent Communication

Agents communicate through:
1. **Shared State**: All agents read/write to `AgentState`
2. **RAG Systems**: Agents store outputs in Project Memory RAG
3. **Decisions**: Agents create `AgentDecision` objects for traceability
4. **No Direct Communication**: Agents don't call each other directly, only through orchestrator

## RAG System Design

### Three RAG Systems

1. **Knowledge Base RAG**: Framework patterns and best practices
   - Populated with general coding knowledge
   - Filterable by framework and pattern type
   - Used by all agents for guidance

2. **Project Memory RAG**: Project-specific agent outputs
   - Stores code, decisions, and artifacts
   - Filterable by project_id, agent_name, artifact_type
   - Enables agents to reference previous work

3. **Approval/Version RAG**: Project evolution tracking
   - Tracks versions and approvals
   - Maintains project history
   - Supports rollback and version comparison

### Why ChromaDB?

- **Lightweight**: Easy to deploy and manage
- **HTTP API**: Simple integration with FastAPI
- **Metadata Filtering**: Supports complex queries
- **Production Ready**: Suitable for production deployments

## Error Handling & Retries

### Retry Strategy

- **Agent Level**: Each agent has retry logic using `tenacity`
- **Workflow Level**: LangGraph handles workflow-level retries
- **Exponential Backoff**: Prevents API rate limiting
- **State Preservation**: Errors are logged but don't corrupt state

### Failure Recovery

- **Checkpointing**: State is saved after each agent execution
- **Error Handler Node**: Dedicated node for error processing
- **Max Retries**: Configurable retry limits prevent infinite loops
- **Graceful Degradation**: System continues with partial results when possible

## Database Design

### PostgreSQL for Metadata

- **Structured Data**: Projects, agent runs, decisions
- **ACID Compliance**: Ensures data consistency
- **Relationships**: Supports complex queries and reporting
- **Mature Ecosystem**: Well-supported and reliable

### ChromaDB for Vectors

- **Semantic Search**: Vector similarity search for RAG
- **Metadata Filtering**: Efficient filtering by project, agent, etc.
- **Scalability**: Handles large document collections
- **Separation of Concerns**: Keeps vector operations separate from relational data

## API Design

### RESTful Endpoints

- **Resource-Based**: `/api/v1/projects/{id}`
- **HTTP Methods**: Proper use of GET, POST, PUT, DELETE
- **Status Codes**: Meaningful HTTP status codes
- **Error Responses**: Consistent error format

### Streaming Support

- **Server-Sent Events**: Real-time workflow updates
- **Non-Blocking**: Doesn't block API server
- **State Updates**: Clients receive state changes as they happen

## Configuration Management

### Environment-Based Configuration

- **12-Factor App**: Follows 12-factor app principles
- **Sensitive Data**: API keys and secrets in environment variables
- **Default Values**: Sensible defaults for development
- **Type Safety**: Pydantic Settings for validation

## Logging & Observability

### Structured Logging

- **JSON Format**: Machine-readable logs for production
- **Context**: Includes project_id, agent_name, etc.
- **Levels**: Appropriate log levels (INFO, ERROR, WARNING)
- **Correlation**: Logs can be correlated by project_id

### Monitoring Points

- **Agent Execution**: Track execution time and success rates
- **LLM Calls**: Monitor API usage and costs
- **RAG Queries**: Track retrieval performance
- **Workflow Progress**: Monitor phase transitions

## Security Considerations

### API Key Management

- **Environment Variables**: Never hardcode API keys
- **Secure Storage**: Use secret management in production
- **Rotation**: Support for key rotation

### Input Validation

- **Pydantic Models**: Validate all API inputs
- **SQL Injection**: SQLAlchemy ORM prevents SQL injection
- **XSS Prevention**: Proper content-type headers

## Scalability Considerations

### Horizontal Scaling

- **Stateless API**: API servers can scale horizontally
- **Database Pooling**: Connection pooling for PostgreSQL
- **ChromaDB**: Can be scaled or replicated

### Performance Optimization

- **Async Operations**: FastAPI async endpoints
- **Connection Pooling**: Database connection reuse
- **Caching**: RAG results could be cached (future enhancement)
- **Batch Operations**: Agents process multiple artifacts efficiently

## Testing Strategy

### Unit Tests

- **Agent Logic**: Test individual agent execution
- **State Management**: Test state transitions
- **RAG Systems**: Test retrieval and storage

### Integration Tests

- **Workflow**: Test complete workflow execution
- **API Endpoints**: Test API integration
- **Database**: Test database operations

### Future Enhancements

- **E2E Tests**: Full system tests
- **Load Testing**: Performance under load
- **Chaos Engineering**: Test failure scenarios

## Future Improvements

1. **Agent Tools**: Implement actual code execution tools
2. **Frontend**: Build React/Vue frontend
3. **Authentication**: Add user authentication and authorization
4. **Multi-Project**: Support multiple concurrent projects
5. **Agent Marketplace**: Allow custom agents
6. **CI/CD Integration**: Direct deployment to cloud platforms
7. **Cost Optimization**: Caching and request batching
8. **Advanced RAG**: Hybrid search, reranking, etc.


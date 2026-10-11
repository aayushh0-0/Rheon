from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from app.database.session import Base
from app.models.base import TimestampMixin


class AgentExecution(Base, TimestampMixin):
    """Placeholder model structure for future multi-agent execution logging."""
    __tablename__ = "agent_executions"

    request_id = Column(String(36), nullable=True, index=True)
    agent_name = Column(String(64), nullable=False)
    state_node = Column(String(64), nullable=False)
    input_state = Column(Text, nullable=True)
    output_state = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=True)


class Decision(Base, TimestampMixin):
    """Placeholder model structure for future audit and decision logging."""
    __tablename__ = "decision_logs"

    request_id = Column(String(36), nullable=True, index=True)
    plan_id = Column(String(36), nullable=True, index=True)
    decision_type = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=False)  # DETERMINISTIC_ENGINE, AGENT_COORDINATOR, HUMAN_DISPATCHER
    justification = Column(Text, nullable=True)

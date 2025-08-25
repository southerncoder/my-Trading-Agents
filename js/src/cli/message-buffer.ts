import { MessageEntry, ToolCallEntry, AgentStatuses, ReportSections } from './types';

export class MessageBuffer {
  private maxLength: number;
  public messages: MessageEntry[] = [];
  public toolCalls: ToolCallEntry[] = [];
  public currentReport: string | undefined;
  public finalReport: string | undefined;
  public agentStatus: AgentStatuses = {};
  public currentAgent: string | undefined;
  public reportSections: ReportSections = {};

  constructor(maxLength = 100) {
    this.maxLength = maxLength;
    this.initializeAgentStatuses();
  }

  private initializeAgentStatuses(): void {
    this.agentStatus = {
      // Analyst Team
      "Market Analyst": "pending",
      "Social Analyst": "pending", 
      "News Analyst": "pending",
      "Fundamentals Analyst": "pending",
      // Research Team
      "Bull Researcher": "pending",
      "Bear Researcher": "pending",
      "Research Manager": "pending",
      // Trading Team
      "Trader": "pending",
      // Risk Management Team
      "Risky Analyst": "pending",
      "Neutral Analyst": "pending",
      "Safe Analyst": "pending",
      // Portfolio Management Team
      "Portfolio Manager": "pending"
    };
  }

  public addMessage(messageType: string, content: string): void {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.messages.push({ timestamp, type: messageType, content });
    
    // Keep only the last maxLength messages
    if (this.messages.length > this.maxLength) {
      this.messages = this.messages.slice(-this.maxLength);
    }
  }

  public addToolCall(toolName: string, args: Record<string, any> | string): void {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.toolCalls.push({ timestamp, name: toolName, args });
    
    // Keep only the last maxLength tool calls
    if (this.toolCalls.length > this.maxLength) {
      this.toolCalls = this.toolCalls.slice(-this.maxLength);
    }
  }

  public updateAgentStatus(agent: string, status: 'pending' | 'in_progress' | 'completed' | 'error'): void {
    if (agent in this.agentStatus) {
      this.agentStatus[agent] = status;
      this.currentAgent = agent;
    }
  }

  public updateReportSection(sectionName: keyof ReportSections, content: string): void {
    this.reportSections[sectionName] = content;
    this.updateCurrentReport();
  }

  private updateCurrentReport(): void {
    // For the panel display, only show the most recently updated section
    let latestSection: string | undefined;
    let latestContent: string | undefined;

    // Find the most recently updated section
    for (const [section, content] of Object.entries(this.reportSections)) {
      if (content !== undefined && content !== null) {
        latestSection = section;
        latestContent = content;
      }
    }

    if (latestSection && latestContent) {
      // Format the current section for display
      const sectionTitles: Record<string, string> = {
        "market_report": "Market Analysis",
        "sentiment_report": "Social Sentiment", 
        "news_report": "News Analysis",
        "fundamentals_report": "Fundamentals Analysis",
        "investment_plan": "Research Team Decision",
        "trader_investment_plan": "Trading Team Plan",
        "final_trade_decision": "Portfolio Management Decision"
      };
      
      this.currentReport = `### ${sectionTitles[latestSection]}\n${latestContent}`;
    }

    // Update the final complete report
    this.updateFinalReport();
  }

  private updateFinalReport(): void {
    const reportParts: string[] = [];

    // Analyst Team Reports
    const analystSections = ['market_report', 'sentiment_report', 'news_report', 'fundamentals_report'];
    if (analystSections.some(section => this.reportSections[section as keyof ReportSections])) {
      reportParts.push("## Analyst Team Reports");
      
      if (this.reportSections.market_report) {
        reportParts.push(`### Market Analysis\n${this.reportSections.market_report}`);
      }
      if (this.reportSections.sentiment_report) {
        reportParts.push(`### Social Sentiment\n${this.reportSections.sentiment_report}`);
      }
      if (this.reportSections.news_report) {
        reportParts.push(`### News Analysis\n${this.reportSections.news_report}`);
      }
      if (this.reportSections.fundamentals_report) {
        reportParts.push(`### Fundamentals Analysis\n${this.reportSections.fundamentals_report}`);
      }
    }

    // Research Team Reports
    if (this.reportSections.investment_plan) {
      reportParts.push("## Research Team Decision");
      reportParts.push(this.reportSections.investment_plan);
    }

    // Trading Team Reports
    if (this.reportSections.trader_investment_plan) {
      reportParts.push("## Trading Team Plan");
      reportParts.push(this.reportSections.trader_investment_plan);
    }

    // Portfolio Management Decision
    if (this.reportSections.final_trade_decision) {
      reportParts.push("## Portfolio Management Decision");
      reportParts.push(this.reportSections.final_trade_decision);
    }

    this.finalReport = reportParts.length > 0 ? reportParts.join('\n\n') : undefined;
  }

  public getAllMessages(): Array<MessageEntry | ToolCallEntry> {
    const allMessages: Array<MessageEntry | ToolCallEntry> = [];
    
    // Add tool calls
    for (const toolCall of this.toolCalls) {
      let argsStr: string;
      if (typeof toolCall.args === 'string') {
        argsStr = toolCall.args.length > 100 ? toolCall.args.slice(0, 97) + "..." : toolCall.args;
      } else {
        const jsonStr = JSON.stringify(toolCall.args);
        argsStr = jsonStr.length > 100 ? jsonStr.slice(0, 97) + "..." : jsonStr;
      }
      
      allMessages.push({
        timestamp: toolCall.timestamp,
        type: "Tool",
        content: `${toolCall.name}: ${argsStr}`
      });
    }

    // Add regular messages
    for (const message of this.messages) {
      let contentStr = message.content;
      
      // Handle various content formats
      if (Array.isArray(message.content)) {
        const textParts: string[] = [];
        for (const item of message.content as any[]) {
          if (typeof item === 'object' && item !== null) {
            if (item.type === 'text') {
              textParts.push(item.text || '');
            } else if (item.type === 'tool_use') {
              textParts.push(`[Tool: ${item.name || 'unknown'}]`);
            }
          } else {
            textParts.push(String(item));
          }
        }
        contentStr = textParts.join(' ');
      } else if (typeof contentStr !== 'string') {
        contentStr = String(contentStr);
      }
      
      // Truncate message content if too long
      if (contentStr.length > 200) {
        contentStr = contentStr.slice(0, 197) + "...";
      }
      
      allMessages.push({
        timestamp: message.timestamp,
        type: message.type,
        content: contentStr
      });
    }

    // Sort by timestamp
    allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    return allMessages;
  }

  public getStats(): { toolCalls: number; llmCalls: number; reports: number } {
    const toolCallsCount = this.toolCalls.length;
    const llmCallsCount = this.messages.filter(msg => msg.type === "Reasoning").length;
    const reportsCount = Object.values(this.reportSections).filter(content => content !== undefined && content !== null).length;
    
    return {
      toolCalls: toolCallsCount,
      llmCalls: llmCallsCount,
      reports: reportsCount
    };
  }

  public reset(): void {
    this.messages = [];
    this.toolCalls = [];
    this.currentReport = undefined;
    this.finalReport = undefined;
    this.currentAgent = undefined;
    this.reportSections = {};
    this.initializeAgentStatuses();
  }
}
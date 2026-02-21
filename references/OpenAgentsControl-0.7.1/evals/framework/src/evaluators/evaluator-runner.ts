/**
 * EvaluatorRunner - Orchestrates evaluation of sessions
 * 
 * Responsibilities:
 * - Register and manage evaluators
 * - Run evaluators against sessions
 * - Aggregate results from multiple evaluators
 * - Generate comprehensive reports
 */

import {
  IEvaluator,
  TimelineEvent,
  SessionInfo,
  EvaluationResult,
  Violation,
  Evidence,
  EvaluatorRegistry
} from '../types/index.js';

import { SessionReader } from '../collector/session-reader.js';
import { TimelineBuilder } from '../collector/timeline-builder.js';

export interface RunnerConfig {
  sessionReader: SessionReader;
  timelineBuilder: TimelineBuilder;
  evaluators?: IEvaluator[];
  sdkClient?: any; // Optional SDK client for enhanced session retrieval
}

export interface AggregatedResult {
  sessionId: string;
  sessionInfo: SessionInfo;
  timestamp: number;
  evaluatorResults: EvaluationResult[];
  overallPassed: boolean;
  overallScore: number;
  totalViolations: number;
  violationsBySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  allViolations: Violation[];
  allEvidence: Evidence[];
}

export class EvaluatorRunner {
  private registry: EvaluatorRegistry = {};
  private sessionReader: SessionReader;
  private timelineBuilder: TimelineBuilder;

  constructor(config: RunnerConfig) {
    this.sessionReader = config.sessionReader;
    this.timelineBuilder = config.timelineBuilder;

    // Register provided evaluators
    if (config.evaluators) {
      config.evaluators.forEach(evaluator => {
        this.register(evaluator);
      });
    }
  }

  /**
   * Register an evaluator
   */
  register(evaluator: IEvaluator): void {
    this.registry[evaluator.name] = evaluator;
  }

  /**
   * Unregister an evaluator
   */
  unregister(evaluatorName: string): void {
    delete this.registry[evaluatorName];
  }

  /**
   * Get registered evaluator
   */
  getEvaluator(evaluatorName: string): IEvaluator | undefined {
    return this.registry[evaluatorName];
  }

  /**
   * Get all registered evaluators
   */
  getEvaluators(): IEvaluator[] {
    return Object.values(this.registry);
  }

  /**
   * Run specific evaluators on a session
   */
  async runEvaluators(
    sessionId: string,
    evaluatorNames?: string[]
  ): Promise<AggregatedResult> {
    // Get session info (now async)
    const sessionInfo = await this.sessionReader.getSessionInfo(sessionId);
    if (!sessionInfo) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Build timeline (already async)
    const timeline = await this.timelineBuilder.buildTimeline(sessionId);

    // Determine which evaluators to run
    const evaluatorsToRun = evaluatorNames
      ? evaluatorNames.map(name => this.registry[name]).filter(Boolean)
      : this.getEvaluators();

    if (evaluatorsToRun.length === 0) {
      throw new Error('No evaluators registered or specified');
    }

    // Run each evaluator
    const results: EvaluationResult[] = [];
    for (const evaluator of evaluatorsToRun) {
      console.log(`Running evaluator: ${evaluator.name}...`);
      const result = await evaluator.evaluate(timeline, sessionInfo);
      results.push(result);
    }

    // Aggregate results
    return this.aggregateResults(sessionId, sessionInfo, results);
  }

  /**
   * Run all registered evaluators on a session
   * 
   * Alias for runEvaluators() with no specific evaluator names.
   */
  async runAll(sessionId: string): Promise<AggregatedResult> {
    return this.runEvaluators(sessionId);
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    return await this.sessionReader.getSessionInfo(sessionId);
  }

  /**
   * Run evaluators on multiple sessions
   */
  async runBatch(sessionIds: string[], evaluatorNames?: string[]): Promise<AggregatedResult[]> {
    const results: AggregatedResult[] = [];

    for (const sessionId of sessionIds) {
      console.log(`\nEvaluating session: ${sessionId}`);
      const result = await this.runEvaluators(sessionId, evaluatorNames);
      results.push(result);
    }

    return results;
  }

  /**
   * Aggregate results from multiple evaluators
   */
  private aggregateResults(
    sessionId: string,
    sessionInfo: SessionInfo,
    evaluatorResults: EvaluationResult[]
  ): AggregatedResult {
    // Collect all violations
    const allViolations: Violation[] = [];
    evaluatorResults.forEach(result => {
      allViolations.push(...result.violations);
    });

    // Count violations by severity
    const violationsBySeverity = {
      error: allViolations.filter(v => v.severity === 'error').length,
      warning: allViolations.filter(v => v.severity === 'warning').length,
      info: allViolations.filter(v => v.severity === 'info').length
    };

    // Collect all evidence
    const allEvidence: Evidence[] = [];
    evaluatorResults.forEach(result => {
      allEvidence.push(...result.evidence);
    });

    // Calculate overall score (weighted average)
    const totalWeight = evaluatorResults.length;
    const weightedScore = evaluatorResults.reduce((sum, result) => sum + result.score, 0);
    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;

    // Overall pass/fail (all evaluators must pass)
    const overallPassed = evaluatorResults.every(result => result.passed);

    return {
      sessionId,
      sessionInfo,
      timestamp: Date.now(),
      evaluatorResults,
      overallPassed,
      overallScore,
      totalViolations: allViolations.length,
      violationsBySeverity,
      allViolations,
      allEvidence
    };
  }

  /**
   * Generate a text report from aggregated results
   */
  generateReport(result: AggregatedResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push(`EVALUATION REPORT: ${result.sessionId}`);
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`Session: ${result.sessionInfo.title}`);
    lines.push(`Created: ${new Date(result.sessionInfo.time.created).toISOString()}`);
    lines.push(`Evaluated: ${new Date(result.timestamp).toISOString()}`);
    lines.push('');

    lines.push(`Overall Status: ${result.overallPassed ? '✓ PASSED' : '✗ FAILED'}`);
    lines.push(`Overall Score: ${result.overallScore}/100`);
    lines.push('');

    lines.push('Violations:');
    lines.push(`  Errors:   ${result.violationsBySeverity.error}`);
    lines.push(`  Warnings: ${result.violationsBySeverity.warning}`);
    lines.push(`  Info:     ${result.violationsBySeverity.info}`);
    lines.push(`  Total:    ${result.totalViolations}`);
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('EVALUATOR RESULTS');
    lines.push('-'.repeat(80));

    for (const evalResult of result.evaluatorResults) {
      lines.push('');
      lines.push(`Evaluator: ${evalResult.evaluator}`);
      lines.push(`  Status: ${evalResult.passed ? '✓ PASSED' : '✗ FAILED'}`);
      lines.push(`  Score: ${evalResult.score}/100`);
      lines.push(`  Violations: ${evalResult.violations.length}`);
      
      if (evalResult.violations.length > 0) {
        lines.push('');
        lines.push('  Violations:');
        evalResult.violations.forEach((violation, idx) => {
          lines.push(`    ${idx + 1}. [${violation.severity.toUpperCase()}] ${violation.message}`);
          lines.push(`       Time: ${new Date(violation.timestamp).toISOString()}`);
        });
      }
    }

    if (result.allViolations.length > 0) {
      lines.push('');
      lines.push('-'.repeat(80));
      lines.push('ALL VIOLATIONS');
      lines.push('-'.repeat(80));
      
      result.allViolations.forEach((violation, idx) => {
        lines.push('');
        lines.push(`${idx + 1}. [${violation.severity.toUpperCase()}] ${violation.type}`);
        lines.push(`   ${violation.message}`);
        lines.push(`   Time: ${new Date(violation.timestamp).toISOString()}`);
        if (violation.evidence) {
          lines.push(`   Evidence: ${JSON.stringify(violation.evidence, null, 2)}`);
        }
      });
    }

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Generate batch summary report
   */
  generateBatchSummary(results: AggregatedResult[]): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('BATCH EVALUATION SUMMARY');
    lines.push('='.repeat(80));
    lines.push('');

    const totalSessions = results.length;
    const passedSessions = results.filter(r => r.overallPassed).length;
    const failedSessions = totalSessions - passedSessions;
    const avgScore = Math.round(
      results.reduce((sum, r) => sum + r.overallScore, 0) / totalSessions
    );

    lines.push(`Total Sessions: ${totalSessions}`);
    lines.push(`Passed: ${passedSessions} (${Math.round((passedSessions / totalSessions) * 100)}%)`);
    lines.push(`Failed: ${failedSessions} (${Math.round((failedSessions / totalSessions) * 100)}%)`);
    lines.push(`Average Score: ${avgScore}/100`);
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('SESSION RESULTS');
    lines.push('-'.repeat(80));

    results.forEach((result, idx) => {
      const status = result.overallPassed ? '✓' : '✗';
      lines.push(`${idx + 1}. ${status} ${result.sessionId} - Score: ${result.overallScore}/100`);
      lines.push(`   Violations: ${result.totalViolations} (E:${result.violationsBySeverity.error} W:${result.violationsBySeverity.warning} I:${result.violationsBySeverity.info})`);
    });

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

import { Clock, CheckCircle, Loader2, Users } from 'lucide-react'
import type { AnalysisRequest, AnalysisProgress as AnalysisProgressType } from '../types/trading'

interface AnalysisProgressProps {
  analysis: AnalysisRequest
  progress?: AnalysisProgressType | null
}

const phases = [
  { 
    id: 1, 
    name: 'Intelligence', 
    description: 'Market, Social, News & Fundamentals Analysis',
    agents: ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst']
  },
  { 
    id: 2, 
    name: 'Research', 
    description: 'Bull/Bear Research & Synthesis',
    agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager']
  },
  { 
    id: 3, 
    name: 'Risk Assessment', 
    description: 'Risk Analysis & Portfolio Management',
    agents: ['Risky Analyst', 'Safe Analyst', 'Neutral Analyst', 'Portfolio Manager']
  },
  { 
    id: 4, 
    name: 'Trading Decision', 
    description: 'Final Trading Recommendation',
    agents: ['Learning Trader']
  },
]

export function AnalysisProgress({ analysis, progress }: AnalysisProgressProps) {
  const currentPhase = progress?.phase || 1
  // const currentProgress = progress?.progress || 0 // Unused for now
  
  const getPhaseStatus = (phaseId: number) => {
    if (phaseId < currentPhase) return 'completed'
    if (phaseId === currentPhase) return 'active'
    return 'pending'
  }

  const getPhaseIcon = (phaseId: number) => {
    const status = getPhaseStatus(phaseId)
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-bull-600" />
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
    }
  }

  const getPhaseColor = (phaseId: number) => {
    const status = getPhaseStatus(phaseId)
    
    switch (status) {
      case 'completed':
        return 'text-bull-600 border-bull-200 bg-bull-50'
      case 'active':
        return 'text-blue-600 border-blue-200 bg-blue-50'
      default:
        return 'text-neutral-500 border-neutral-200 bg-neutral-50'
    }
  }

  const startTime = new Date(analysis.createdAt)
  const currentTime = new Date()
  const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const remainingSeconds = elapsedSeconds % 60

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Analyzing {analysis.symbol}
          </h2>
          <p className="text-neutral-600 capitalize">
            {analysis.type} Analysis in Progress
          </p>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-neutral-600">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>
              {elapsedMinutes}:{remainingSeconds.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>12 Agents</span>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-900">
              Phase {progress.phase}: {progress.phaseName}
            </span>
            <span className="text-sm text-blue-700">
              {progress.progress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="text-sm text-blue-800">
            <span className="font-medium">{progress.currentAgent}</span>
            {progress.message && (
              <span className="ml-2">• {progress.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Phase Progress */}
      <div className="space-y-4">
        {phases.map((phase, index) => (
          <div key={phase.id} className="relative">
            {/* Connector Line */}
            {index < phases.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-neutral-200" />
            )}
            
            <div className={`flex items-start space-x-4 p-4 rounded-lg border ${getPhaseColor(phase.id)}`}>
              <div className="flex-shrink-0 mt-1">
                {getPhaseIcon(phase.id)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium">
                    Phase {phase.id}: {phase.name}
                  </h3>
                  {getPhaseStatus(phase.id) === 'completed' && (
                    <span className="text-xs text-bull-600 font-medium">
                      Completed
                    </span>
                  )}
                  {getPhaseStatus(phase.id) === 'active' && (
                    <span className="text-xs text-blue-600 font-medium">
                      In Progress
                    </span>
                  )}
                </div>
                
                <p className="text-sm mb-2">
                  {phase.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {phase.agents.map((agent) => (
                    <span 
                      key={agent}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        getPhaseStatus(phase.id) === 'completed'
                          ? 'bg-bull-100 text-bull-700'
                          : getPhaseStatus(phase.id) === 'active' && progress?.currentAgent === agent
                          ? 'bg-blue-100 text-blue-700 animate-pulse'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Time */}
      <div className="mt-6 pt-4 border-t border-neutral-200">
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>Estimated completion time: 2-5 minutes</span>
          <span>
            Phase {currentPhase} of {phases.length}
          </span>
        </div>
      </div>
    </div>
  )
}
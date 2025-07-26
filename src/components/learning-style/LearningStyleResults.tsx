'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Progress, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface LearningStyleResult {
  id: string;
  userId: string;
  scores: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading: number;
  };
  primaryStyle: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
  secondaryStyle?: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
  recommendations: string[];
  studyTips: string[];
  completedAt: Date;
}

export interface LearningStyleResultsProps {
  result: LearningStyleResult;
  onRetake?: () => void;
  onViewRecommendations?: () => void;
}

const styleDefinitions = {
  VISUAL: {
    name: '視覚型学習者',
    icon: '👁️',
    color: 'text-blue-600 bg-blue-100',
    description: '図表、色、映像などの視覚的な情報を通じて最も効果的に学習します。',
    characteristics: [
      '図やグラフを見ることで理解が深まる',
      'カラフルな資料や映像に集中しやすい',
      '空間的な配置や視覚的なパターンを覚えやすい',
      'マインドマップや図解が効果的',
    ],
    studyMethods: [
      'カラーペンやマーカーを使った色分け学習',
      '図表やグラフを積極的に活用',
      'マインドマップやフローチャートの作成',
      '視覚的な記憶術（イメージ連想法）',
      'プレゼンテーション資料の作成',
    ],
    tools: [
      'カラーペン・マーカー',
      'ホワイトボード・付箋',
      '図解・チャート作成ツール',
      '動画・映像教材',
      'ビジュアル学習アプリ',
    ],
  },
  AUDITORY: {
    name: '聴覚型学習者',
    icon: '👂',
    color: 'text-green-600 bg-green-100',
    description: '音声、音楽、会話などの聴覚的な情報を通じて最も効果的に学習します。',
    characteristics: [
      '説明を聞くことで理解が深まる',
      '音読や復唱が効果的',
      'リズムや音楽と組み合わせると記憶しやすい',
      'ディスカッションや会話を通じた学習が得意',
    ],
    studyMethods: [
      '音読・復唱による記憶定着',
      '録音した内容を繰り返し聞く',
      '音楽やリズムと組み合わせた暗記',
      'グループディスカッション',
      '説明を声に出して整理',
    ],
    tools: [
      '録音・再生機器',
      '音楽・リズム教材',
      'ポッドキャスト・オーディオブック',
      'オンライン会話ツール',
      '音声認識アプリ',
    ],
  },
  KINESTHETIC: {
    name: '体験型学習者',
    icon: '🤲',
    color: 'text-orange-600 bg-orange-100',
    description: '実際に体を動かし、手を使った体験を通じて最も効果的に学習します。',
    characteristics: [
      '実際に手を動かすことで理解が深まる',
      '体験や実習を通じた学習が得意',
      '動きながら考えることで集中力が向上',
      '具体的な例や実例が理解を助ける',
    ],
    studyMethods: [
      '実験・実習による体験学習',
      '手を動かしながらの学習（書く、作る）',
      '歩きながらの暗記・復習',
      'ロールプレイや演技による理解',
      '模型や教具を使った学習',
    ],
    tools: [
      '実験器具・教具',
      '模型・立体教材',
      'ホワイトボード・大きな紙',
      'VR・AR学習ツール',
      '体験型学習アプリ',
    ],
  },
  READING: {
    name: '読書型学習者',
    icon: '📚',
    color: 'text-purple-600 bg-purple-100',
    description: '文字や文章を読み書きすることを通じて最も効果的に学習します。',
    characteristics: [
      '文字情報の読み書きで理解が深まる',
      '静かな環境での集中学習が得意',
      'ノート作成や要約が効果的',
      '論理的で体系的な学習を好む',
    ],
    studyMethods: [
      '詳細なノート作成と整理',
      '要約・まとめの作成',
      '文章での説明・記述練習',
      '読書による知識吸収',
      'レポート・論文作成',
    ],
    tools: [
      '良質なノート・ペン',
      '参考書・専門書',
      'デジタルノートアプリ',
      '文書作成ソフト',
      'オンライン図書館',
    ],
  },
};

export const LearningStyleResults: React.FC<LearningStyleResultsProps> = ({
  result,
  onRetake,
  onViewRecommendations,
}) => {
  const primaryStyleInfo = styleDefinitions[result.primaryStyle];
  const totalScore = Object.values(result.scores).reduce((sum, score) => sum + score, 0);
  
  const sortedStyles = Object.entries(result.scores)
    .map(([style, score]) => ({
      style: style.toUpperCase() as keyof typeof styleDefinitions,
      score,
      percentage: totalScore > 0 ? (score / totalScore) * 100 : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const getStyleIcon = (style: string) => {
    return styleDefinitions[style as keyof typeof styleDefinitions]?.icon || '🎯';
  };

  const getStyleColor = (style: string) => {
    return styleDefinitions[style as keyof typeof styleDefinitions]?.color || 'text-gray-600 bg-gray-100';
  };

  const getStyleName = (style: string) => {
    return styleDefinitions[style as keyof typeof styleDefinitions]?.name || style;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">学習スタイル診断結果</CardTitle>
          <p className="text-text-muted">
            {new Date(result.completedAt).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} に完了
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Primary Style */}
          <div className="text-center mb-8">
            <div className="text-8xl mb-4">
              {primaryStyleInfo.icon}
            </div>
            <h3 className="text-3xl font-bold mb-2">
              あなたの主な学習スタイル
            </h3>
            <div className={cn(
              'inline-block px-6 py-3 rounded-full text-xl font-medium mb-4',
              primaryStyleInfo.color
            )}>
              {primaryStyleInfo.name}
            </div>
            <p className="text-text-muted max-w-2xl mx-auto">
              {primaryStyleInfo.description}
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedStyles.map(({ style, score, percentage }, index) => (
              <div key={style} className="relative">
                <Card className={cn(
                  'h-full transition-all',
                  index === 0 ? 'ring-2 ring-primary-500 shadow-lg' : ''
                )}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">
                      {getStyleIcon(style)}
                    </div>
                    <h4 className="font-medium text-sm text-text-muted mb-2">
                      {getStyleName(style)}
                    </h4>
                    <div className="text-2xl font-bold mb-2">{score}点</div>
                    <Progress value={percentage} className="h-2 mb-2" />
                    <div className="text-xs text-text-muted">
                      {percentage.toFixed(1)}%
                    </div>
                    {index === 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-primary-500">
                        主要
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Characteristics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">{primaryStyleInfo.icon}</span>
              <span>あなたの学習特性</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {primaryStyleInfo.characteristics.map((characteristic, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{characteristic}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Study Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>推奨学習方法</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {primaryStyleInfo.studyMethods.map((method, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm">{method}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>推奨学習ツール</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {primaryStyleInfo.tools.map((tool, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="text-sm font-medium">{tool}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>個別推奨事項</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onViewRecommendations && (
          <button
            onClick={onViewRecommendations}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            個別学習プランを見る
          </button>
        )}
        {onRetake && (
          <button
            onClick={onRetake}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            診断を再受験
          </button>
        )}
      </div>
    </div>
  );
};

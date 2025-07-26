import Image from "next/image";
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Grid, GridItem } from '@/components/layout/Grid';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <Container>
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
              スマートチューター
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-8">
              個別最適化されたAI学習システムで、<br className="hidden md:block" />
              あなたの学習を効率的にサポートします。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  無料で始める
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  ログイン
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 特徴セクション */}
      <section className="py-20 bg-background-primary">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              スマートチューターの特徴
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              AI技術を活用した個別最適化学習で、効率的な学習体験を提供します。
            </p>
          </div>
          
          <Grid cols={3} gap="lg">
            <GridItem>
              <Card className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <CardTitle>AI個別最適化</CardTitle>
                  <CardDescription className="text-text-secondary">
                    学習者の理解度や進捗に応じて、AIが最適な学習プランを自動生成します。
                  </CardDescription>
                </CardHeader>
              </Card>
            </GridItem>
            
            <GridItem>
              <Card className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <CardTitle>リアルタイム分析</CardTitle>
                  <CardDescription className="text-text-secondary">
                    学習進捗をリアルタイムで分析し、弱点や得意分野を可視化します。
                  </CardDescription>
                </CardHeader>
              </Card>
            </GridItem>
            
            <GridItem>
              <Card className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <CardTitle>多様な学習者対応</CardTitle>
                  <CardDescription className="text-text-secondary">
                    学習者、保護者、教育者それぞれに最適化されたダッシュボードを提供します。
                  </CardDescription>
                </CardHeader>
              </Card>
            </GridItem>
          </Grid>
        </Container>
      </section>

      {/* 対象ユーザーセクション */}
      <section className="bg-background-secondary py-20">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              誰でも使える学習システム
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              学習者から教育者まで、それぞれのニーズに合わせた機能を提供します。
            </p>
          </div>
          
          <Grid cols={2} gap="lg">
            <GridItem>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="math">学習者</Badge>
                    <Badge variant="japanese">保護者</Badge>
                  </div>
                  <CardTitle>個人学習者・保護者向け</CardTitle>
                  <CardDescription className="text-text-secondary">
                    個別最適化された学習プランで効率的な学習をサポート。保護者は子どもの学習進捗を確認できます。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-text-muted">
                    <li>• 個別学習プラン生成</li>
                    <li>• 進捗追跡・分析</li>
                    <li>• 弱点克服サポート</li>
                    <li>• 保護者向け進捗レポート</li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>
            
            <GridItem>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="science">教育者</Badge>
                    <Badge variant="social">管理者</Badge>
                  </div>
                  <CardTitle>教育者・管理者向け</CardTitle>
                  <CardDescription className="text-text-secondary">
                    クラス管理や学習コンテンツ作成、全体的な学習分析機能を提供します。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-text-muted">
                    <li>• コース・レッスン作成</li>
                    <li>• 学習者管理</li>
                    <li>• 評価・分析ツール</li>
                    <li>• システム管理機能</li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>
        </Container>
      </section>

      {/* CTAセクション */}
      <section className="bg-primary-600 py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-text-inverse">
              今すぐ始めましょう
            </h2>
            <p className="text-xl mb-8 text-text-inverse-secondary">
              無料でアカウントを作成して、AI学習システムを体験してください。
            </p>
            <Link href="/auth/signup">
              <Button variant="secondary" size="lg">
                無料で始める
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

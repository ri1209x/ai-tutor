import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// GET /api/questions/template - CSVテンプレート生成
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみテンプレート取得可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'テンプレート取得権限がありません' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeExamples = searchParams.get('examples') === 'true';

    // CSVヘッダー
    const headers = [
      'title',           // タイトル（オプション）
      'content',         // 問題文（必須）
      'questionType',    // 問題タイプ（必須：MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY, FILL_BLANK）
      'difficulty',      // 難易度（オプション：EASY, MEDIUM, HARD, EXPERT）
      'options',         // 選択肢（JSON配列または カンマ区切り）
      'correctAnswer',   // 正解（必須）
      'explanation',     // 解説（オプション）
      'hints',           // ヒント（JSON配列または カンマ区切り）
      'points',          // 配点（デフォルト：1）
      'estimatedTime',   // 推定時間（分）
      'subject',         // 科目（オプション）
      'topic',           // トピック（オプション）
      'keywords',        // キーワード（JSON配列または カンマ区切り）
      'isPublic',        // 公開設定（true/false、デフォルト：true）
    ];

    let csvContent = headers.join(',') + '\n';

    // サンプルデータを追加
    if (includeExamples) {
      const examples = [
        [
          '二次方程式の基本',
          'x² - 5x + 6 = 0 の解を求めなさい',
          'MULTIPLE_CHOICE',
          'MEDIUM',
          '["x = 1, 2", "x = 2, 3", "x = 3, 4", "x = 1, 6"]',
          'x = 2, 3',
          '因数分解を使って (x-2)(x-3) = 0 として解きます',
          '["因数分解を試してみましょう", "x²の係数が1なので簡単です"]',
          '2',
          '3',
          '数学',
          '二次方程式',
          '["二次方程式", "因数分解", "解の公式"]',
          'true'
        ],
        [
          '英語の過去形',
          'I ( ) to the store yesterday. の括弧に入る適切な動詞を選びなさい',
          'MULTIPLE_CHOICE',
          'EASY',
          '["go", "goes", "went", "going"]',
          'went',
          'yesterdayがあるので過去形のwentが正解です',
          '["時を表す語に注目", "過去の出来事を表現"]',
          '1',
          '2',
          '英語',
          '過去形',
          '["過去形", "動詞", "時制"]',
          'true'
        ],
        [
          '光合成の仕組み',
          '植物が光合成で作り出す物質は何ですか？',
          'SHORT_ANSWER',
          'EASY',
          '',
          'ブドウ糖（グルコース）',
          '植物は光エネルギーを使って二酸化炭素と水からブドウ糖を作ります',
          '["光エネルギーが必要", "二酸化炭素と水が材料"]',
          '1',
          '2',
          '理科',
          '光合成',
          '["光合成", "植物", "ブドウ糖"]',
          'true'
        ],
        [
          '江戸時代の政治',
          '江戸幕府を開いた人物は誰ですか？',
          'SHORT_ANSWER',
          'EASY',
          '',
          '徳川家康',
          '1603年に徳川家康が江戸幕府を開き、約260年間続きました',
          '["1603年", "徳川氏", "関ヶ原の戦いの後"]',
          '1',
          '2',
          '社会',
          '江戸時代',
          '["江戸幕府", "徳川家康", "江戸時代"]',
          'true'
        ]
      ];

      for (const example of examples) {
        // CSVエスケープ処理
        const escapedExample = example.map(field => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });
        csvContent += escapedExample.join(',') + '\n';
      }
    }

    // レスポンスヘッダーを設定
    const headers_response = new Headers();
    headers_response.set('Content-Type', 'text/csv; charset=utf-8');
    headers_response.set('Content-Disposition', `attachment; filename="questions_template_${includeExamples ? 'with_examples' : 'empty'}.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: headers_response,
    });

  } catch (error) {
    console.error('テンプレート生成エラー:', error);
    return NextResponse.json(
      { error: 'テンプレート生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/questions/template - カスタムテンプレート生成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみテンプレート生成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'テンプレート生成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      subject, 
      topic, 
      difficulty, 
      questionTypes, 
      includeHints = true,
      includeKeywords = true,
      rowCount = 10 
    } = body;

    // CSVヘッダー
    let headers = [
      'title',
      'content',
      'questionType',
      'difficulty',
      'options',
      'correctAnswer',
      'explanation',
    ];

    if (includeHints) headers.push('hints');
    headers.push('points', 'estimatedTime');
    if (subject) headers.push('subject');
    if (topic) headers.push('topic');
    if (includeKeywords) headers.push('keywords');
    headers.push('isPublic');

    let csvContent = headers.join(',') + '\n';

    // 空行を指定された数だけ追加
    for (let i = 0; i < rowCount; i++) {
      const row = new Array(headers.length).fill('');
      
      // デフォルト値を設定
      if (subject) {
        const subjectIndex = headers.indexOf('subject');
        if (subjectIndex !== -1) row[subjectIndex] = subject;
      }
      
      if (topic) {
        const topicIndex = headers.indexOf('topic');
        if (topicIndex !== -1) row[topicIndex] = topic;
      }
      
      if (difficulty) {
        const difficultyIndex = headers.indexOf('difficulty');
        if (difficultyIndex !== -1) row[difficultyIndex] = difficulty;
      }
      
      if (questionTypes && questionTypes.length > 0) {
        const typeIndex = headers.indexOf('questionType');
        if (typeIndex !== -1) {
          // 複数の問題タイプがある場合はローテーション
          row[typeIndex] = questionTypes[i % questionTypes.length];
        }
      }
      
      // デフォルト値
      const pointsIndex = headers.indexOf('points');
      if (pointsIndex !== -1) row[pointsIndex] = '1';
      
      const publicIndex = headers.indexOf('isPublic');
      if (publicIndex !== -1) row[publicIndex] = 'true';

      csvContent += row.join(',') + '\n';
    }

    // レスポンスヘッダーを設定
    const headers_response = new Headers();
    headers_response.set('Content-Type', 'text/csv; charset=utf-8');
    headers_response.set('Content-Disposition', `attachment; filename="custom_questions_template.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: headers_response,
    });

  } catch (error) {
    console.error('カスタムテンプレート生成エラー:', error);
    return NextResponse.json(
      { error: 'カスタムテンプレート生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

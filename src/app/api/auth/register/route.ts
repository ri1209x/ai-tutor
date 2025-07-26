import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, grade, birthDate } = body;

    // バリデーション
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // ユーザー作成
    const userData = {
      name,
      email,
      password: hashedPassword,
      role: role as UserRole,
      ...(role === 'LEARNER' && {
        ...(grade && { grade: parseInt(grade) }),
        ...(birthDate && { birthDate: new Date(birthDate) })
      })
    };



    const user = await prisma.user.create({
      data: userData,
    });

    return NextResponse.json(
      {
        message: 'ユーザーが正常に作成されました',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'ユーザー作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

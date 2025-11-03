import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
    import { getExpenseCategoryModel } from '@/models/Expense';
import mongoose from 'mongoose';

/**
 * GET /api/expenses/categories
 * Fetch all expense categories
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connection = await getTenantConnection(user.organizationId);
    const ExpenseCategory = getExpenseCategoryModel(connection);

    const categories = await ExpenseCategory.find({
      organizationId: user.organizationId,
    })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error: any) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses/categories
 * Create a new expense category with transaction support
 */
export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required.' },
        { status: 400 }
      );
    }

    // Register models first    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const ExpenseCategory = getExpenseCategoryModel(connection);

    // Check if category already exists
    const existingCategory = await ExpenseCategory.findOne({
      name: name.trim(),
      organizationId: user.organizationId,
    }).session(session).read('primary');

    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    // Create category
    const category = await ExpenseCategory.create(
      [
        {
          name: name.trim(),
          description,
          organizationId: user.organizationId,
        },
      ],
      { session }
    );

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      data: category[0],
      message: 'Category created successfully',
    });
  } catch (error: any) {
    // Rollback transaction on error
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    console.error('Error creating expense category:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  } finally {
    // End session
    if (session) {
      try {
        session.endSession();
      } catch (endError) {
        console.error('Error ending session:', endError);
      }
    }
  }
}

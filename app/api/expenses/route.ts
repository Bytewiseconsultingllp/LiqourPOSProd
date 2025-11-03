import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
import { getExpenseModel } from '@/models/Expense';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/expenses
 * Fetch all expenses with optional filters
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

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMode = searchParams.get('paymentMode');

    const connection = await getTenantConnection(user.organizationId);
    const Expense = getExpenseModel(connection);

    // Build query
    const query: any = { organizationId: user.organizationId };
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) {
        query.expenseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.expenseDate.$lte = new Date(endDate);
      }
    }
    
    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    const expenses = await Expense.find(query)
      .sort({ expenseDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: expenses,
      count: expenses.length,
    });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Create a new expense entry with transaction support
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
    const { 
      categoryId, 
      categoryName, 
      amount, 
      description, 
      expenseDate, 
      paymentMode, 
      transactionId, 
      receiptUrl, 
      notes 
    } = body;

    // Validation
    if (!categoryId || !categoryName || !amount || amount <= 0 || !paymentMode) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense data. Category, amount, and payment mode are required.' },
        { status: 400 }
      );
    }

    // Register models first    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Expense = getExpenseModel(connection);

    // Generate unique expense number
    const expenseCount = await Expense.countDocuments({
      organizationId: user.organizationId,
    }).session(session).read('primary');
    const expenseNumber = `EXP-${Date.now()}-${String(expenseCount + 1).padStart(4, '0')}`;

    // Create expense record
    const expense = await Expense.create(
      [
        {
          expenseNumber,
          categoryId,
          categoryName,
          amount,
          description,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          paymentMode,
          transactionId,
          receiptUrl,
          notes,
          organizationId: user.organizationId,
          createdBy: user.userId,
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
      data: expense[0],
      message: 'Expense created successfully',
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
    
    console.error('Error creating expense:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create expense' },
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

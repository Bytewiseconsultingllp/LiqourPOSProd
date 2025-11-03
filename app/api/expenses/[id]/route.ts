import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTenantConnection } from '@/lib/tenant-db';
import { registerAllModels } from '@/lib/model-registry';
import { getExpenseModel } from '@/models/Expense';
import mongoose from 'mongoose';

/**
 * GET /api/expenses/[id]
 * Fetch a single expense by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const connection = await getTenantConnection(user.organizationId);
    const Expense = getExpenseModel(connection);

    const expense = await Expense.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).lean();

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/expenses/[id]
 * Update an expense with transaction support
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    registerAllModels();
    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Expense = getExpenseModel(connection);

    // Check if expense exists
    const existingExpense = await Expense.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).session(session).read('primary');

    if (!existingExpense) {
      throw new Error('Expense not found');
    }

    // Update expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      params.id,
      {
        categoryId,
        categoryName,
        amount,
        description,
        expenseDate: expenseDate ? new Date(expenseDate) : existingExpense.expenseDate,
        paymentMode,
        transactionId,
        receiptUrl,
        notes,
      },
      { session, new: true }
    );

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      data: updatedExpense,
      message: 'Expense updated successfully',
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
    
    console.error('Error updating expense:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update expense' },
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

/**
 * DELETE /api/expenses/[id]
 * Delete an expense with transaction support
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: mongoose.ClientSession | null = null;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Register models first
    registerAllModels();
    
    const connection = await getTenantConnection(user.organizationId);
    
    // Start transaction
    session = await connection.startSession();
    session.startTransaction();

    const Expense = getExpenseModel(connection);

    // Check if expense exists
    const expense = await Expense.findOne({
      _id: params.id,
      organizationId: user.organizationId,
    }).session(session).read('primary');

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Delete expense
    await Expense.findByIdAndDelete(params.id, { session });

    // Commit transaction
    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
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
    
    console.error('Error deleting expense:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete expense' },
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

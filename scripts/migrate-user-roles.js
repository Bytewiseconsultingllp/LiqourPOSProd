/**
 * Migration Script: Update User Roles
 * 
 * This script updates existing user roles from the old format to the new format:
 * - admin -> org_admin (for the first admin of each organization)
 * - admin -> admin (for other admins)
 * - staff -> sales
 * - manager -> manager (no change)
 */

const mongoose = require('mongoose');

async function migrateUserRoles() {
  try {
    console.log('🔄 Starting user role migration...\n');

    // Connect to database
    const mongoUri = 'mongodb+srv://admin:admin@software-development.fr9zrj9.mongodb.net/NewLiqourPOS?retryWrites=true&w=majority&appName=SOFTWARE-DEVELOPMENT';
    console.log(`Connecting to MongoDB Atlas...\n`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get User collection
    const User = mongoose.connection.collection('users');

    // Get all organizations
    const organizations = await User.distinct('organizationId');
    console.log(`Found ${organizations.length} organizations\n`);

    let totalUpdated = 0;

    for (const orgId of organizations) {
      console.log(`Processing organization: ${orgId}`);

      // Find all users in this organization
      const users = await User.find({ organizationId: orgId }).toArray();
      
      // Find the first admin (will become org_admin)
      const firstAdmin = users.find(u => u.role === 'admin');
      
      if (firstAdmin) {
        // Update first admin to org_admin
        await User.updateOne(
          { _id: firstAdmin._id },
          { $set: { role: 'org_admin' } }
        );
        console.log(`  ✅ Updated ${firstAdmin.email} to org_admin`);
        totalUpdated++;
      }

      // Update remaining admins (keep as admin)
      const otherAdmins = users.filter(u => u.role === 'admin' && u._id.toString() !== firstAdmin?._id.toString());
      for (const admin of otherAdmins) {
        // They stay as 'admin', no change needed
        console.log(`  ℹ️  ${admin.email} remains as admin`);
      }

      // Update staff to sales
      const staffUsers = users.filter(u => u.role === 'staff');
      if (staffUsers.length > 0) {
        const result = await User.updateMany(
          { 
            organizationId: orgId,
            role: 'staff'
          },
          { $set: { role: 'sales' } }
        );
        console.log(`  ✅ Updated ${result.modifiedCount} staff users to sales`);
        totalUpdated += result.modifiedCount;
      }

      console.log('');
    }

    console.log(`\n✅ Migration completed! Updated ${totalUpdated} users.`);
    console.log('\n📋 Summary:');
    console.log('  - First admin of each org -> org_admin');
    console.log('  - Other admins -> admin');
    console.log('  - All staff -> sales');
    console.log('  - Managers -> manager (no change)\n');

    // Show final counts
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('Current role distribution:');
    roleCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run migration
migrateUserRoles();

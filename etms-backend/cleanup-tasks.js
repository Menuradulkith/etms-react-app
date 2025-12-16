const mongoose = require('mongoose');
const Task = require('./models/Task');
const SubTask = require('./models/SubTask');

mongoose.connect('mongodb://localhost:27017/etms_db').then(async () => {
  try {
    const tasks = await Task.find().select('_id task_id task_name createdAt').sort({ createdAt: 1 });
    console.log('All tasks:');
    tasks.forEach(t => console.log(`  ${t._id}: ${t.task_id} - ${t.task_name} (${t.createdAt})`));

    // Find duplicates
    const taskIdMap = {};
    const duplicates = [];
    
    tasks.forEach(task => {
      if (!taskIdMap[task.task_id]) {
        taskIdMap[task.task_id] = [];
      }
      taskIdMap[task.task_id].push(task._id);
    });

    Object.entries(taskIdMap).forEach(([taskId, ids]) => {
      if (ids.length > 1) {
        duplicates.push({ taskId, ids });
      }
    });

    if (duplicates.length > 0) {
      console.log('\nFound duplicates:');
      duplicates.forEach(dup => {
        console.log(`  TaskId: ${dup.taskId}`);
        dup.ids.forEach(id => console.log(`    - ${id}`));
      });

      // Keep the first one, delete the rest
      console.log('\nDeleting duplicate tasks (keeping the first one)...');
      for (const dup of duplicates) {
        for (let i = 1; i < dup.ids.length; i++) {
          await Task.deleteOne({ _id: dup.ids[i] });
          console.log(`  Deleted: ${dup.ids[i]}`);
        }
      }
      console.log('Cleanup complete!');
    } else {
      console.log('\nNo duplicates found!');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    mongoose.connection.close();
  }
}).catch(err => console.error('Connection error:', err));

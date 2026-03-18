const express = require('express');
const _ = require('lodash');
const moment = require('moment');
const router = express.Router();

const tasks = [];

router.get('/', (req, res) => {
  const sorted = _.orderBy(tasks, ['createdAt'], ['desc']);
  res.json(sorted);
});

router.post('/', (req, res) => {
  const task = {
    id: _.uniqueId('task_'),
    title: req.body.title,
    completed: false,
    createdAt: moment().toISOString(),
    dueDate: req.body.dueDate
      ? moment(req.body.dueDate).format('YYYY-MM-DD')
      : null,
  };
  tasks.push(task);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const task = _.find(tasks, { id: req.params.id });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  _.merge(task, req.body);
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const idx = _.findIndex(tasks, { id: req.params.id });
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  tasks.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;

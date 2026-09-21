const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const jobs = [
  {
    id: 1,
    title: 'Senior Frontend Engineer',
    company: 'Northstar Labs',
    status: 'Applied',
    date: '2025-01-06',
    location: 'Remote',
    salary: '$130k',
  },
  {
    id: 2,
    title: 'Product Designer',
    company: 'Blue Peak Studio',
    status: 'Interview',
    date: '2025-01-08',
    location: 'Hybrid',
    salary: '$110k',
  },
];

router.get('/', requireAuth, async (req, res) => {
  return sendSuccess(res, jobs, 'Jobs fetched successfully.');
});

router.post(
  '/',
  requireAuth,
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('company').trim().notEmpty().withMessage('Company is required.'),
    body('status').trim().notEmpty().withMessage('Status is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'VALIDATION_ERROR', errors.array()[0].msg, 400);
    }

    const newJob = {
      id: Date.now(),
      ...req.body,
      date: new Date().toISOString().slice(0, 10),
    };

    jobs.unshift(newJob);
    return sendSuccess(res, newJob, 'Job created successfully.', 201);
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  const jobIndex = jobs.findIndex((job) => String(job.id) === req.params.id);

  if (jobIndex === -1) {
    return sendError(res, 'JOB_NOT_FOUND', 'Job not found.', 404);
  }

  jobs[jobIndex] = { ...jobs[jobIndex], ...req.body };
  return sendSuccess(res, jobs[jobIndex], 'Job updated successfully.');
});

router.delete('/:id', requireAuth, async (req, res) => {
  const jobIndex = jobs.findIndex((job) => String(job.id) === req.params.id);

  if (jobIndex === -1) {
    return sendError(res, 'JOB_NOT_FOUND', 'Job not found.', 404);
  }

  const [deletedJob] = jobs.splice(jobIndex, 1);
  return sendSuccess(res, deletedJob, 'Job deleted successfully.');
});

module.exports = router;

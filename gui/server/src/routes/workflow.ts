import { Router } from 'express';
import {
  createExecutionForIssue,
  getWorkflowIssueDetail,
  getWorkflowOverview,
  parseIssueRef,
  updateWorkflowIssue,
} from '../lib/workflow.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    res.json(await getWorkflowOverview({ refresh }));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/issues/:issueRef', async (req, res) => {
  try {
    const issueRef = decodeURIComponent(req.params.issueRef);
    parseIssueRef(issueRef);
    res.json(await getWorkflowIssueDetail(issueRef));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.patch('/issues/:issueRef', async (req, res) => {
  try {
    const issueRef = decodeURIComponent(req.params.issueRef);
    parseIssueRef(issueRef);
    res.json(await updateWorkflowIssue(issueRef, req.body));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.post('/issues/:issueRef/execution', async (req, res) => {
  try {
    const issueRef = decodeURIComponent(req.params.issueRef);
    parseIssueRef(issueRef);
    res.status(201).json(await createExecutionForIssue(issueRef, req.body));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;

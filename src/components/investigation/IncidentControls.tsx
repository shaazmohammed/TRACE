import { useState, type FormEvent } from 'react';
import {
  INCIDENT_STATUSES,
  RESPONSE_ACTION_TYPES,
  type Incident,
  type IncidentStatus,
  type ResponseActionType,
} from '../../types/trace';
import { humanize } from '../../utils/format';

const NOTE_MAX = 2000;
const ACTION_MAX = 500;

interface Props {
  incident: Incident;
  onUpdateStatus: (status: IncidentStatus, author: string) => Promise<void>;
  onAddNote: (content: string, author: string) => Promise<void>;
  onRecordAction: (actionType: ResponseActionType, description: string, author: string) => Promise<void>;
}

type Feedback = { tone: 'success' | 'error'; message: string } | null;

function useSubmission() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const submit = async (action: () => Promise<void>, successMessage: string) => {
    setPending(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: 'success', message: successMessage });
      return true;
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Request failed.' });
      return false;
    } finally {
      setPending(false);
    }
  };
  return { pending, feedback, setFeedback, submit };
}

export function IncidentControls({ incident, onUpdateStatus, onAddNote, onRecordAction }: Props) {
  const [author, setAuthor] = useState('');
  const [authorTouched, setAuthorTouched] = useState(false);
  const trimmedAuthor = author.trim();
  const authorError = !trimmedAuthor ? 'Analyst name is required for the audit trail.' : null;

  const requireAuthor = () => {
    setAuthorTouched(true);
    return !authorError;
  };

  return (
    <div className="controls">
      <label className="field">
        <span className="field-label">Analyst</span>
        <input
          className={`input ${authorTouched && authorError ? 'invalid' : ''}`}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          onBlur={() => setAuthorTouched(true)}
          placeholder="e.g. r.alvarez"
          maxLength={80}
          autoComplete="username"
          aria-invalid={authorTouched && Boolean(authorError)}
          aria-describedby="author-error"
        />
        {authorTouched && authorError && (
          <span id="author-error" className="field-error">
            {authorError}
          </span>
        )}
      </label>

      <StatusForm incident={incident} author={trimmedAuthor} requireAuthor={requireAuthor} onSubmit={onUpdateStatus} />
      <NoteForm author={trimmedAuthor} requireAuthor={requireAuthor} onSubmit={onAddNote} />
      <ActionForm author={trimmedAuthor} requireAuthor={requireAuthor} onSubmit={onRecordAction} />
    </div>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p className={`feedback ${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
      {feedback.message}
    </p>
  );
}

function StatusForm({
  incident,
  author,
  requireAuthor,
  onSubmit,
}: {
  incident: Incident;
  author: string;
  requireAuthor: () => boolean;
  onSubmit: Props['onUpdateStatus'];
}) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const { pending, feedback, setFeedback, submit } = useSubmission();
  const unchanged = status === incident.status;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (unchanged) {
      setFeedback({ tone: 'error', message: 'Choose a different status to update.' });
      return;
    }
    if (!requireAuthor()) return;
    await submit(() => onSubmit(status, author), `Status updated to ${humanize(status)}.`);
  };

  return (
    <form className="control-block" onSubmit={handle} noValidate>
      <h3 className="subhead">Change status</h3>
      <div className="inline-form">
        <label className="field grow">
          <span className="sr-only">New status</span>
          <select className="input select" value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
            {INCIDENT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
                {option === incident.status ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={pending || unchanged}>
          {pending ? 'Updating…' : 'Update'}
        </button>
      </div>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}

function NoteForm({ author, requireAuthor, onSubmit }: { author: string; requireAuthor: () => boolean; onSubmit: Props['onAddNote'] }) {
  const [content, setContent] = useState('');
  const { pending, feedback, setFeedback, submit } = useSubmission();
  const trimmed = content.trim();

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setFeedback({ tone: 'error', message: 'Note cannot be empty.' });
      return;
    }
    if (!requireAuthor()) return;
    if (await submit(() => onSubmit(trimmed, author), 'Note added.')) setContent('');
  };

  return (
    <form className="control-block" onSubmit={handle} noValidate>
      <h3 className="subhead">Add investigation note</h3>
      <label className="field">
        <span className="sr-only">Note</span>
        <textarea
          className="input textarea"
          rows={3}
          value={content}
          maxLength={NOTE_MAX}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Findings, hypotheses, next steps…"
        />
      </label>
      <div className="form-foot">
        <span className="muted small mono">
          {content.length}/{NOTE_MAX}
        </span>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Add note'}
        </button>
      </div>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}

function ActionForm({
  author,
  requireAuthor,
  onSubmit,
}: {
  author: string;
  requireAuthor: () => boolean;
  onSubmit: Props['onRecordAction'];
}) {
  const [actionType, setActionType] = useState<ResponseActionType | ''>('');
  const [description, setDescription] = useState('');
  const { pending, feedback, setFeedback, submit } = useSubmission();
  const trimmed = description.trim();

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (!actionType) {
      setFeedback({ tone: 'error', message: 'Select an action type.' });
      return;
    }
    if (!trimmed) {
      setFeedback({ tone: 'error', message: 'Describe the action taken.' });
      return;
    }
    if (!requireAuthor()) return;
    if (await submit(() => onSubmit(actionType, trimmed, author), 'Response action recorded.')) {
      setDescription('');
      setActionType('');
    }
  };

  return (
    <form className="control-block" onSubmit={handle} noValidate>
      <h3 className="subhead">Record response action</h3>
      <label className="field">
        <span className="sr-only">Action type</span>
        <select
          className="input select"
          value={actionType}
          onChange={(e) => setActionType(e.target.value as ResponseActionType | '')}
        >
          <option value="">Select action type…</option>
          {RESPONSE_ACTION_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="sr-only">Action description</span>
        <input
          className="input"
          value={description}
          maxLength={ACTION_MAX}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Blocked 185.220.101.47 at perimeter firewall"
        />
      </label>
      <div className="form-foot">
        <span />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Recording…' : 'Record action'}
        </button>
      </div>
      <FeedbackLine feedback={feedback} />
    </form>
  );
}

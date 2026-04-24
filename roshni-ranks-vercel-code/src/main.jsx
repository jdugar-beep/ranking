import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Search, Star, UserPlus, LogOut, Plus, Check, X } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const categories = ['Food', 'Movie', 'TV', 'Book', 'Trip', 'Other'];

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('feed');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseUrl || !supabaseAnonKey) {
    return <SetupWarning />;
  }

  if (!session) return <Auth />;

  return (
    <Shell session={session} view={view} setView={setView}>
      {view === 'feed' && <Feed user={session.user} />}
      {view === 'add' && <AddRanking user={session.user} afterSave={() => setView('feed')} />}
      {view === 'friends' && <Friends user={session.user} />}
    </Shell>
  );
}

function SetupWarning() {
  return (
    <div className="centerPage">
      <div className="panel">
        <h1>Roshni Ranks</h1>
        <p>Add these environment variables in Vercel before deploying:</p>
        <code>VITE_SUPABASE_URL</code>
        <code>VITE_SUPABASE_ANON_KEY</code>
      </div>
    </div>
  );
}

function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setMessage(error.message);

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          display_name: displayName || email.split('@')[0]
        });
      }
      setMessage('Account created. Check your email if confirmation is enabled, then log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
  }

  return (
    <div className="centerPage">
      <form className="authCard" onSubmit={submit}>
        <div className="brandMark">RR</div>
        <h1>Roshni Ranks</h1>
        <p>Rate anything. Share your taste with friends.</p>

        {mode === 'signup' && (
          <input placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        )}
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />

        <button>{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}

function Shell({ session, children, view, setView }) {
  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <h1>Roshni Ranks</h1>
          <p>{session.user.email}</p>
        </div>
        <nav>
          <button className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>Feed</button>
          <button className={view === 'add' ? 'active' : ''} onClick={() => setView('add')}><Plus size={16}/> Add</button>
          <button className={view === 'friends' ? 'active' : ''} onClick={() => setView('friends')}>Friends</button>
          <button onClick={logout}><LogOut size={16}/> Logout</button>
        </nav>
      </header>
      <main className="layout">{children}</main>
    </div>
  );
}

function Feed({ user }) {
  const [rankings, setRankings] = useState([]);

  async function load() {
    const { data, error } = await supabase
      .from('visible_rankings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setRankings(data || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="wide">
      <h2>Friend Feed</h2>
      <p className="muted">Your rankings and accepted friends’ rankings appear here.</p>
      <div className="grid">
        {rankings.map(item => <RankingCard key={item.id} item={item} mine={item.user_id === user.id} />)}
        {rankings.length === 0 && <Empty text="No rankings yet. Add your first ranking or connect with friends." />}
      </div>
    </section>
  );
}

function RankingCard({ item, mine }) {
  return (
    <article className="card">
      <div className="cardTop">
        <span className="pill">{item.category}</span>
        <span className="stars"><Star size={16} fill="currentColor" /> {item.rating}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.notes || 'No notes yet.'}</p>
      <footer>{mine ? 'You' : item.display_name || item.email} · {new Date(item.created_at).toLocaleDateString()}</footer>
    </article>
  );
}

function AddRanking({ user, afterSave }) {
  const [category, setCategory] = useState('Food');
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState('5');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  async function save(e) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.from('rankings').insert({
      user_id: user.id,
      category,
      title,
      rating: Number(rating),
      notes
    });

    if (error) return setMessage(error.message);
    afterSave();
  }

  return (
    <section className="formPanel">
      <h2>Add a ranking</h2>
      <form onSubmit={save}>
        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Boka, Past Lives, Lisbon" required />

        <label>Rating</label>
        <input value={rating} onChange={e => setRating(e.target.value)} type="number" min="0" max="5" step="0.1" required />

        <label>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What made it great?" />

        <button>Save ranking</button>
        {message && <p className="message">{message}</p>}
      </form>
    </section>
  );
}

function Friends({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState('');

  async function load() {
    const { data: reqs } = await supabase
      .from('friend_requests_view')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: frs } = await supabase
      .from('friends_view')
      .select('*')
      .order('display_name');

    setRequests(reqs || []);
    setFriends(frs || []);
  }

  useEffect(() => { load(); }, []);

  async function search(e) {
    e.preventDefault();
    setMessage('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name')
      .ilike('email', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) return setMessage(error.message);
    setResults(data || []);
  }

  async function sendRequest(profileId) {
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: profileId,
      status: 'pending'
    });
    setMessage(error ? error.message : 'Friend request sent.');
    load();
  }

  async function respond(id, status) {
    await supabase.from('friendships').update({ status }).eq('id', id);
    load();
  }

  return (
    <section className="wide">
      <h2>Friends</h2>
      <div className="twoCol">
        <div className="panel">
          <h3>Find friends</h3>
          <form className="searchForm" onSubmit={search}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by email" />
            <button><Search size={16}/> Search</button>
          </form>
          {results.map(p => (
            <div className="row" key={p.id}>
              <span>{p.display_name || p.email}</span>
              <button onClick={() => sendRequest(p.id)}><UserPlus size={16}/> Add</button>
            </div>
          ))}
          {message && <p className="message">{message}</p>}
        </div>

        <div className="panel">
          <h3>Requests</h3>
          {requests.map(r => (
            <div className="row" key={r.id}>
              <span>{r.display_name || r.email}</span>
              <div>
                <button onClick={() => respond(r.id, 'accepted')}><Check size={16}/></button>
                <button className="danger" onClick={() => respond(r.id, 'rejected')}><X size={16}/></button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <Empty text="No pending requests." />}
        </div>

        <div className="panel">
          <h3>Your friends</h3>
          {friends.map(f => <div className="row" key={f.friend_id}><span>{f.display_name || f.email}</span></div>)}
          {friends.length === 0 && <Empty text="No friends yet." />}
        </div>
      </div>
    </section>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

createRoot(document.getElementById('root')).render(<App />);

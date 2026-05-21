const SPINE_COLORS = ['#d4960a','#8b4513','#2e7d32','#1565c0','#6a1b9a','#bf360c','#37474f'];
let books = JSON.parse(localStorage.getItem('lms_books') || '[]');
let txns  = JSON.parse(localStorage.getItem('lms_txns')  || '[]');

function save() {
  localStorage.setItem('lms_books', JSON.stringify(books));
  localStorage.setItem('lms_txns',  JSON.stringify(txns));
}

function showTab(tab, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  el.classList.add('active');
  if (tab === 'dashboard')    renderDashboard();
  if (tab === 'books')        renderBooks();
  if (tab === 'issue')        renderIssueSelects();
  if (tab === 'transactions') renderTransactions();
}

function addBook() {
  const title  = document.getElementById('b-title').value.trim();
  const author = document.getElementById('b-author').value.trim();
  const isbn   = document.getElementById('b-isbn').value.trim();
  const genre  = document.getElementById('b-genre').value;
  const copies = parseInt(document.getElementById('b-copies').value) || 1;
  if (!title || !author) { alert('Title and Author required.'); return; }
  books.push({ id: Date.now(), title, author, isbn, genre, copies, available: copies, color: SPINE_COLORS[books.length % SPINE_COLORS.length] });
  save();
  ['b-title','b-author','b-isbn'].forEach(id => document.getElementById(id).value = '');
  alert('Book added!');
  renderDashboard();
}

function deleteBook(id) {
  if (!confirm('Delete this book?')) return;
  books = books.filter(b => b.id !== id);
  save(); renderBooks(); renderDashboard();
}

function issueBook() {
  const member = document.getElementById('i-member').value.trim();
  const mid    = document.getElementById('i-mid').value.trim();
  const bid    = parseInt(document.getElementById('i-book').value);
  if (!member || !mid || !bid) { alert('Fill all fields.'); return; }
  const book = books.find(b => b.id === bid);
  if (!book || book.available <= 0) { alert('Book not available.'); return; }
  book.available -= 1;
  txns.unshift({ id: Date.now(), bookId: bid, bookTitle: book.title, member, mid, issueDate: new Date().toISOString().split('T')[0], returnDate: null, fine: 0, status: 'issued' });
  save(); renderIssueSelects(); alert(`Book issued to ${member}!`);
}

function returnBook() {
  const tid = parseInt(document.getElementById('r-book').value);
  if (!tid) { alert('Select a book to return.'); return; }
  const txn = txns.find(t => t.id === tid); if (!txn) return;
  const book = books.find(b => b.id === txn.bookId);
  if (book) book.available += 1;
  const days = Math.floor((new Date() - new Date(txn.issueDate)) / (1000*60*60*24));
  const fine = Math.max(0, days - 14) * 2;
  txn.returnDate = new Date().toISOString().split('T')[0];
  txn.fine = fine; txn.status = 'returned';
  save(); renderIssueSelects(); alert(`Returned! Fine: ₹${fine} (${days} days, free for first 14)`);
}

function renderDashboard() {
  document.getElementById('total-books').textContent     = books.reduce((a,b) => a+b.copies, 0);
  document.getElementById('available-books').textContent = books.reduce((a,b) => a+b.available, 0);
  document.getElementById('issued-books').textContent    = books.reduce((a,b) => a+(b.copies-b.available), 0);
  document.getElementById('total-fines').textContent     = '₹' + txns.reduce((a,t) => a+t.fine, 0);
  const recent = [...books].slice(-3).reverse();
  const el = document.getElementById('recent-books');
  if (!recent.length) { el.innerHTML = '<div class="empty">No books yet.</div>'; return; }
  el.innerHTML = recent.map(b => `
    <div class="book-card">
      <div class="book-spine" style="background:${b.color}"></div>
      <div class="book-info">
        <div class="book-title">${b.title}</div>
        <div class="book-author">by ${b.author}</div>
        <div class="book-meta">${b.genre} · ${b.copies} cop${b.copies>1?'ies':'y'}</div>
      </div>
      <div class="book-right"><span class="badge ${b.available>0?'available':'issued'}">${b.available>0?'Available':'Issued'}</span></div>
    </div>`).join('');
}

function renderBooks() {
  const q = document.getElementById('book-search').value.toLowerCase();
  const filtered = books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  const el = document.getElementById('books-list');
  if (!filtered.length) { el.innerHTML = '<div class="empty">No books found.</div>'; return; }
  el.innerHTML = filtered.map(b => `
    <div class="book-card">
      <div class="book-spine" style="background:${b.color}"></div>
      <div class="book-info">
        <div class="book-title">${b.title}</div>
        <div class="book-author">by ${b.author}</div>
        <div class="book-meta">${b.genre}${b.isbn?' · ISBN: '+b.isbn:''} · ${b.available}/${b.copies} available</div>
      </div>
      <div class="book-right">
        <span class="badge ${b.available>0?'available':'issued'}">${b.available>0?'Available':'All Issued'}</span>
        <div class="book-actions"><button class="btn-del" onclick="deleteBook(${b.id})">Delete</button></div>
      </div>
    </div>`).join('');
}

function renderIssueSelects() {
  const isel = document.getElementById('i-book');
  isel.innerHTML = '<option value="">-- Select Available Book --</option>' + books.filter(b => b.available>0).map(b => `<option value="${b.id}">${b.title} (${b.available} left)</option>`).join('');
  const rsel = document.getElementById('r-book');
  rsel.innerHTML = '<option value="">-- Select Issued Book --</option>' + txns.filter(t => t.status==='issued').map(t => `<option value="${t.id}">${t.bookTitle} — ${t.member} (${t.issueDate})</option>`).join('');
}

function renderTransactions() {
  const el = document.getElementById('txn-list');
  if (!txns.length) { el.innerHTML = '<div class="empty">No transactions yet.</div>'; return; }
  el.innerHTML = txns.map(t => `
    <div class="txn-card">
      <div class="txn-dot" style="background:${t.status==='issued'?'#d9534f':'#5cb85c'}"></div>
      <div class="txn-info">
        <div class="t-main">${t.bookTitle}</div>
        <div class="t-sub">${t.member} (${t.mid}) · Issued: ${t.issueDate}${t.returnDate?' · Returned: '+t.returnDate:''}</div>
      </div>
      ${t.fine>0?`<span class="fine-badge">Fine: ₹${t.fine}</span>`:''}
      <span class="badge ${t.status==='issued'?'issued':'available'}">${t.status==='issued'?'Issued':'Returned'}</span>
    </div>`).join('');
}

renderDashboard();

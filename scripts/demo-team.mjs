// Dev-only: creates a ready-to-test team with KNOWN passwords covering every
// participant state (active leader, active member, invited member), plus one
// pre-collected checkpoint so the collection UI has data. Run after `npm run seed`.
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'

const db = new Database('.data/bicta.db')
const tok = () => randomBytes(24).toString('hex')
const inv = () => randomBytes(32).toString('hex')

// Wipe any prior demo rows so this is idempotent.
db.prepare("DELETE FROM registrations WHERE email LIKE '%@demo.com'").run()
db.prepare("DELETE FROM participant_accounts WHERE email LIKE '%@demo.com'").run()

const comp = db.prepare("SELECT id, name FROM competitions WHERE registration_open = 1 AND team_based = 1 LIMIT 1").get()
if (!comp) { console.error('No open team-based competition found. Run npm run seed first.'); process.exit(1) }

const pass = bcrypt.hashSync('demo1234', 12)

// Registration (team record).
const reg = db.prepare(
  "INSERT INTO registrations (competition_id, full_name, email, phone, institution, team_name, status) VALUES (?,?,?,?,?,?, 'confirmed')"
).run(comp.id, 'Demo Leader', 'leader@demo.com', '+8801700000001', 'Demo University', 'Team Demo')
const regId = reg.lastInsertRowid

// Accounts.
const leaderTok = tok(), memberTok = tok(), invitedTok = tok(), invitedInvite = inv()
const leader = db.prepare("INSERT INTO participant_accounts (email,password_hash,full_name,phone,status,checkin_token) VALUES (?,?,?,?, 'active', ?)")
  .run('leader@demo.com', pass, 'Demo Leader', '+8801700000001', leaderTok)
const member = db.prepare("INSERT INTO participant_accounts (email,password_hash,full_name,phone,status,checkin_token) VALUES (?,?,?,?, 'active', ?)")
  .run('member@demo.com', pass, 'Demo Member', '+8801700000002', memberTok)
const invited = db.prepare("INSERT INTO participant_accounts (email,full_name,status,invite_token,checkin_token) VALUES (?,?, 'invited', ?, ?)")
  .run('invited@demo.com', 'Invited Member', invitedInvite, invitedTok)

db.prepare("INSERT INTO team_members (registration_id,account_id,role) VALUES (?,?, 'leader')").run(regId, leader.lastInsertRowid)
db.prepare("INSERT INTO team_members (registration_id,account_id,role) VALUES (?,?, 'member')").run(regId, member.lastInsertRowid)
db.prepare("INSERT INTO team_members (registration_id,account_id,role) VALUES (?,?, 'member')").run(regId, invited.lastInsertRowid)

// Keep legacy JSON roster in sync.
db.prepare("UPDATE registrations SET team_members = ? WHERE id = ?")
  .run(JSON.stringify([{ name: 'Demo Member', email: 'member@demo.com' }, { name: 'Invited Member', email: 'invited@demo.com' }]), regId)

// Pre-collect the first checkpoint for the leader (shows a checked item).
const cp = db.prepare("SELECT id, name FROM checkpoints WHERE active = 1 ORDER BY sort_order LIMIT 1").get()
if (cp) db.prepare("INSERT INTO checkins (account_id,checkpoint_id) VALUES (?,?)").run(leader.lastInsertRowid, cp.id)

console.log(`
Demo team ready for "${comp.name}" (team_members=3)
  Leader  : leader@demo.com  / demo1234   (active, canManage, ${cp ? cp.name + ' collected' : ''})
  Member  : member@demo.com  / demo1234   (active, read-only)
  Invited : invited@demo.com             (no password yet — accept invite at:)
            /portal/set-password?token=${invitedInvite}
  QR tokens (paste into scanner manual entry): leader=${leaderTok.slice(0,16)}…  member=${memberTok.slice(0,16)}…
`)
process.exit(0)

// app.js
import * as api from './api.js';
import { generateTeams, GENERAL_TECH_SKILLS } from './teamFormation.js';

let currentUser = null;
let currentProject = null; 

const $ = id => document.getElementById(id);

const showView = id => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $(id).classList.add('active');
    window.scrollTo(0,0);
};

const showMsg = (id, text, type = 'info') => {
    const el = $(id); el.textContent = text; el.className = `msg msg-${type} show`;
};
const hideMsg = id => { $(id).className = 'msg'; };

const getInitials = name => name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

async function initApp() {
    currentUser = api.getCurrentUser();
    if (!currentUser) { showView('view-login'); return; }

    $('nav-right').style.display = 'flex';
    $('nav-user-info').textContent = `${currentUser.name} (${currentUser.role})`;

    if (currentUser.role === 'manager') {
        await renderManagerHome();
        showView('view-manager');
    } else {
        await renderMemberHome();
        showView('view-member');
    }
}

$('btn-login').addEventListener('click', async () => {
    const name = $('login-name').value.trim();
    const role = $('login-role').value;
    if (!name) return alert('Please enter a display name.');
    await api.loginUser(name, role);
    initApp();
});

$('btn-logout').addEventListener('click', async () => {
    await api.logoutUser();
    window.location.reload(); 
});


// ================= MANAGER DASHBOARD =================
async function renderManagerHome() {
    const projects = await api.getProjects(currentUser.id, 'manager');
    $('stat-projects').textContent = projects.length;
    $('stat-active-projects').textContent = projects.filter(p => p.status === 'active').length;

    let totalCompatibility = 0, projectsWithTeams = 0;
    for (const p of projects) {
        if (p.teams && p.teams.length > 0) {
            totalCompatibility += p.teams.reduce((sum, team) => sum + team.compatibilityScore, 0) / p.teams.length;
            projectsWithTeams++;
        }
    }
    $('stat-avg-comp').textContent = projectsWithTeams > 0 ? `${Math.round(totalCompatibility / projectsWithTeams)}%` : '--';

    const list = $('manager-project-list');
    list.innerHTML = '';
    if (!projects.length) {
        list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--ink3);">No projects yet — create one.</div>`;
        return;
    }

    projects.forEach(p => {
        const row = document.createElement('div');
        row.className = 'card';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:16px;">${p.name}</strong><br>
                    <span style="font-size:12px; color:var(--ink3);">ID: ${p.id} | Size: ${p.teamSize}</span>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="openProjectManager('${p.id}')">Manage →</button>
            </div>`;
        list.appendChild(row);
    });
}

$('btn-new-project').addEventListener('click', () => {
    $('pf-name').value = ''; $('pf-tasks').value = '';
    showView('view-project-form');
});
$('pf-cancel').addEventListener('click', () => initApp());

$('pf-save').addEventListener('click', async () => {
    const data = {
        name: $('pf-name').value.trim(),
        industry: $('pf-industry').value,
        teamSize: parseInt($('pf-team-size').value),
        tasks: $('pf-tasks').value.split('\n').map(t => t.trim()).filter(Boolean)
    };
    if (!data.name || data.teamSize < 2) return alert('Valid name and team size (2+) required.');
    
    await api.createProject({ managerId: currentUser.id, ...data });
    initApp();
});

// Make function global so inline onclicks work
window.openProjectManager = async function(projectId) {
    currentProject = await api.getProjectById(projectId);
    $('pd-title').textContent = currentProject.name;
    $('pd-meta').textContent = `ID: ${currentProject.id} | Size: ${currentProject.teamSize} | Industry: ${currentProject.industry}`;
    hideMsg('generate-msg');

    if (currentProject.status === 'planning') {
        $('pd-generation-section').style.display = 'block';
        $('pd-progress-section').style.display = 'none';
        await renderManagerEnrollment(currentProject);
    } else {
        $('pd-generation-section').style.display = 'none';
        $('pd-progress-section').style.display = 'block';
        await renderManagerProgress(currentProject);
    }
    await renderTeamResults(currentProject);
    showView('view-project-detail');
}

$('btn-back-mgr').addEventListener('click', () => initApp());

async function renderManagerEnrollment(project) {
    // FIX applied here: Ensure ONLY members are shown, and current manager is excluded
    const eligibleMembers = (await api.getAllUsers()).filter(u => u.role === 'member' && u.id !== currentUser.id); 
    const enrollments = await api.getEnrollmentsForProject(project.id);
    const enrolledIds = enrollments.map(e => e.userId);

    const sel = $('enroll-select');
    sel.innerHTML = '<option value="">Select a member…</option>';
    for (const member of eligibleMembers) {
        const assessment = await api.getPersonalityAssessment(member.id);
        const isEnrolled = enrolledIds.includes(member.id);
        
        const opt = document.createElement('option');
        opt.value = member.id;
        opt.textContent = `${member.name} ${!assessment ? '(No Quiz)' : ''} ${isEnrolled ? '(Enrolled)' : ''}`;
        opt.disabled = !assessment || isEnrolled; 
        sel.appendChild(opt);
    }

    const enrolledList = $('enrolled-list');
    enrolledList.innerHTML = '';
    enrollments.forEach(async e => {
        const user = await api.getAllUsers().then(users => users.find(u => u.id === e.userId));
        if (user) enrolledList.innerHTML += `<span class="pill pill-navy" style="margin-right:5px;">${user.name}</span>`;
    });
}

$('btn-enroll').addEventListener('click', async () => {
    const memberId = $('enroll-select').value;
    if (!memberId) return;
    await api.enrollInProject(currentProject.id, memberId, 0); 
    openProjectManager(currentProject.id); 
});

$('btn-generate').addEventListener('click', async () => {
    const enrollments = await api.getEnrollmentsForProject(currentProject.id);
    if (enrollments.length < currentProject.teamSize || enrollments.length % currentProject.teamSize !== 0) {
        return showMsg('generate-msg', `Ensure total members is divisible by team size (${currentProject.teamSize}).`, 'err');
    }

    const memberProfiles = [];
    for (const e of enrollments) {
        const user = await api.getAllUsers().then(users => users.find(u => u.id === e.userId));
        const assessment = await api.getPersonalityAssessment(user.id);
        if(!assessment) return showMsg('generate-msg', `Member ${user.name} has no assessment.`, 'err');
        
        memberProfiles.push({
            userId: user.id, name: user.name,
            traits: assessment,
            skills: e.techScore > 50 ? ['coding'] : [],
            experienceYears: assessment.experienceYears
        });
    }

    try {
        const { teams } = generateTeams(memberProfiles, currentProject.teamSize, currentProject.tasks, GENERAL_TECH_SKILLS);
        await api.saveGeneratedTeams(currentProject.id, teams, teams.flatMap(t => t.members.flatMap(m => m.tasks.map(desc => ({ description: desc, assignedUserId: m.userId })))));
        showMsg('generate-msg', `Generated ${teams.length} teams successfully!`, 'ok');
        openProjectManager(currentProject.id);
    } catch (error) {
        showMsg('generate-msg', error.message, 'err');
    }
});

async function renderManagerProgress(project) {
    const tasks = await api.getTasksForProject(project.id);
    const completed = tasks.filter(t => t.isCompleted).length;
    const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
    $('pd-progress-bar').style.width = `${pct}%`;
    $('pd-progress-text').textContent = `${completed} of ${tasks.length} tasks completed (${pct}%)`;

    if (project.status !== 'completed') {
        $('btn-complete-project').style.display = 'block';
        $('btn-complete-project').onclick = async () => {
            await api.updateProject({ id: project.id, status: 'completed' });
            openProjectManager(project.id);
        };
    } else {
        $('btn-complete-project').style.display = 'none';
    }
}

async function renderTeamResults(project) {
    const wrap = $('pd-results'); wrap.innerHTML = '';
    if (!project.teams) return;

    project.teams.forEach(t => {
        let html = `
            <div class="team-block">
                <div class="team-header">
                    <strong>${t.name}</strong> <span>Comp: ${t.compatibilityScore}</span>
                </div>`;
        t.members.forEach(m => {
            html += `
                <div class="member-row">
                    <div class="member-av">${getInitials(m.name)}</div>
                    <div>
                        <strong>${m.name}</strong> - <span class="pill pill-gray">${m.role}</span><br>
                        <span style="font-size:12px;color:var(--ink3);">${m.explanation}</span>
                    </div>
                </div>`;
        });
        html += `</div>`;
        wrap.innerHTML += html;
    });
}


// ================= MEMBER DASHBOARD =================
async function renderMemberHome() {
    $('mem-greeting').textContent = `Hello, ${currentUser.name}.`;
    const assessment = await api.getPersonalityAssessment(currentUser.id);

    if (assessment) {
        showMsg('member-assessment-status', 'Personality Assessment complete — you can enroll in projects.', 'ok');
        $('btn-take-personality-quiz').textContent = 'Review/Edit assessment';
    } else {
        showMsg('member-assessment-status', 'Finish your assessment to join projects.', 'err');
        $('btn-take-personality-quiz').textContent = 'Take assessment';
    }

    const projects = await api.getProjects(currentUser.id, 'member');
    const list = $('member-enrollments'); list.innerHTML = '';
    projects.forEach(p => {
        list.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div><strong>${p.name}</strong> <span class="pill pill-gray">${p.status}</span></div>
                ${p.teams ? `<button class="btn btn-ghost btn-sm" onclick="openMemberDashboard('${p.id}')">View Team</button>` : `<span style="font-size:12px; color:var(--ink3);">Waiting for manager</span>`}
            </div>`;
    });
}

$('btn-join').addEventListener('click', async () => {
    const pid = $('join-project-id').value.trim();
    if (!pid) return;
    const project = await api.getProjectById(pid);
    if (!project) return showMsg('join-msg', 'Invalid ID', 'err');

    const assessment = await api.getPersonalityAssessment(currentUser.id);
    if (!assessment) return showMsg('join-msg', 'Take personality quiz first.', 'err');

    currentProject = project;
    $('tech-quiz-industry-name').textContent = project.industry;
    renderTechQuiz(project.industry);
    showView('view-tech-quiz');
});


// ================= QUIZZES & INSIGHTS =================
const PERSONALITY_QUESTIONS = [
    { text: "I am the life of the party.", trait: "extraversion" },
    { text: "I sympathize with others' feelings.", trait: "agreeableness" },
    { text: "I get chores done right away.", trait: "conscientiousness" },
    { text: "I have frequent mood swings.", trait: "neuroticism" },
    { text: "I have a vivid imagination.", trait: "openness" }
];

$('btn-take-personality-quiz').addEventListener('click', async () => {
    const container = $('personality-quiz-container'); container.innerHTML = '';
    PERSONALITY_QUESTIONS.forEach((q, idx) => {
        container.innerHTML += `
            <div class="likert-row">
                <div class="likert-question">${idx + 1}. ${q.text}</div>
                <div class="likert-options">
                    <label><input type="radio" name="q${idx}" value="1"><span>1</span> Strongly Disagree</label>
                    <label><input type="radio" name="q${idx}" value="2"><span>2</span> Disagree</label>
                    <label><input type="radio" name="q${idx}" value="3"><span>3</span> Neutral</label>
                    <label><input type="radio" name="q${idx}" value="4"><span>4</span> Agree</label>
                    <label><input type="radio" name="q${idx}" value="5"><span>5</span> Strongly Agree</label>
                </div>
            </div>`;
    });
    showView('view-personality-quiz');
});
$('btn-cancel-personality').addEventListener('click', () => initApp());

// The new Personality Insights flow happens here!
$('btn-submit-personality').addEventListener('click', async () => {
    const scores = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    let answered = 0;
    PERSONALITY_QUESTIONS.forEach((q, idx) => {
        const sel = document.querySelector(`input[name="q${idx}"]:checked`);
        if (sel) { scores[q.trait] = parseInt(sel.value) * 20; answered++; }
    });
    if (answered < 5) return alert('Answer all questions.');
    
    await api.savePersonalityAssessment(currentUser.id, scores, parseInt($('exp-years').value) || 0);
    
    // Determine Top Trait
    const traits = [
        { id: 'openness', name: 'The Innovator (Openness)', icon: '💡', desc: 'You are highly creative, open to new experiences, and bring innovative ideas to the table.', strength: 'Creative Problem Solving & Out-of-the-box Thinking' },
        { id: 'conscientiousness', name: 'The Organizer (Conscientiousness)', icon: '📋', desc: 'You are detail-oriented, structured, and highly reliable. Teams count on you to keep the project on track.', strength: 'Project Management, Reliability & Precision' },
        { id: 'extraversion', name: 'The Communicator (Extraversion)', icon: '🗣️', desc: 'You are outgoing, energetic, and excellent at communicating. You keep team morale high.', strength: 'Leadership, Motivation & Clear Communication' },
        { id: 'agreeableness', name: 'The Harmonizer (Agreeableness)', icon: '🤝', desc: 'You are cooperative, empathetic, and a fantastic team player. You naturally resolve conflicts.', strength: 'Team Cohesion, Empathy & Conflict Resolution' },
        { id: 'neuroticism', name: 'The Analyst (Cautiousness)', icon: '🔍', desc: 'You are highly analytical and anticipate risks well. You think carefully before acting.', strength: 'Risk Management & Quality Assurance' } 
    ];

    traits.sort((a, b) => scores[b.id] - scores[a.id]);
    const topTrait = traits[0];

    $('insight-icon').textContent = topTrait.icon;
    $('insight-title').textContent = topTrait.name;
    $('insight-desc').textContent = topTrait.desc;
    $('insight-strengths').textContent = topTrait.strength;

    showView('view-personality-results');
});

$('btn-finish-results').addEventListener('click', () => initApp());

function renderTechQuiz(industry) {
    $('tech-quiz-container').innerHTML = `
        <div class="field">
            <label>Rate your proficiency for ${industry.toUpperCase()} tools</label>
            <select id="tech-q1"><option value="20">Novice</option><option value="60">Intermediate</option><option value="100">Expert</option></select>
        </div>`;
}

$('btn-submit-tech').addEventListener('click', async () => {
    const score = parseInt($('tech-q1').value);
    await api.enrollInProject(currentProject.id, currentUser.id, score);
    $('join-project-id').value = '';
    initApp();
});


// ================= MEMBER TEAM VIEW =================
window.openMemberDashboard = async function(projectId) {
    const project = await api.getProjectById(projectId);
    const myTeam = project.teams.find(t => t.memberIds.includes(currentUser.id));
    const me = myTeam.members.find(m => m.userId === currentUser.id);

    $('md-team-name').textContent = myTeam.name;
    $('md-my-role').innerHTML = `Role: <strong>${me.role}</strong><br><span style="font-size:12px">${me.explanation}</span>`;
    
    $('md-feedback-alert').style.display = project.status === 'completed' ? 'block' : 'none';

    const tasks = await api.getTasksForProject(projectId);
    const myTasks = tasks.filter(t => t.assignedUserId === currentUser.id);
    const tl = $('md-task-list'); tl.innerHTML = '';
    myTasks.forEach(t => {
        tl.innerHTML += `<li class="task-item ${t.isCompleted ? 'done' : ''}">
            <input type="checkbox" onchange="toggleTask('${t.id}', this.checked)" ${t.isCompleted ? 'checked' : ''}>
            <span>${t.description}</span>
        </li>`;
    });

    const ml = $('md-teammates-list'); ml.innerHTML = '';
    myTeam.members.forEach(m => {
        ml.innerHTML += `<div class="member-row"><div class="member-av">${getInitials(m.name)}</div><div><strong>${m.name}</strong> - ${m.role}</div></div>`;
    });

    showView('view-member-dash');
}
$('btn-member-dash-back').addEventListener('click', () => initApp());

window.toggleTask = async function(taskId, isChecked) {
    await api.updateTaskStatus(taskId, isChecked);
}

// FEEDBACK
$('btn-go-feedback').addEventListener('click', () => {
    $('feedback-container').innerHTML = `
        <div class="field">
            <label>Rate your team out of 5 stars</label>
            <select id="fb-rating"><option value="5">5 Stars</option><option value="1">1 Star</option></select>
        </div>`;
    showView('view-feedback');
});
$('btn-submit-feedback').addEventListener('click', async () => {
    await api.submitFeedback([{ reviewerId: currentUser.id, rating: $('fb-rating').value }]);
    alert('Feedback Submitted!');
    initApp();
});

// START APP
initApp();
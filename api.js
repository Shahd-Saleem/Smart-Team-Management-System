// api.js

const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function loginUser(name, role) {
    let users = JSON.parse(localStorage.getItem('st_users') || '[]');
    let user = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.role === role);
    if (!user) {
        user = { id: uid('user'), name, role };
        users.push(user);
        localStorage.setItem('st_users', JSON.stringify(users));
    }
    localStorage.setItem('st_session', JSON.stringify(user));
    return user;
}

export function getCurrentUser() {
    return JSON.parse(localStorage.getItem('st_session') || 'null');
}

export function logoutUser() {
    localStorage.removeItem('st_session');
}

export async function getAllUsers() {
    return JSON.parse(localStorage.getItem('st_users') || '[]');
}

export async function createProject(data) {
    let projects = JSON.parse(localStorage.getItem('st_projects') || '[]');
    const newProject = { id: uid('proj'), status: 'planning', teams: null, ...data };
    projects.push(newProject);
    localStorage.setItem('st_projects', JSON.stringify(projects));
    return newProject;
}

export async function getProjects(userId, role) {
    let projects = JSON.parse(localStorage.getItem('st_projects') || '[]');
    if (role === 'manager') {
        return projects.filter(p => p.managerId === userId);
    } else {
        const enrollments = await getEnrollmentsForUser(userId);
        const enrolledProjectIds = enrollments.map(e => e.projectId);
        return projects.filter(p => enrolledProjectIds.includes(p.id));
    }
}

export async function getProjectById(projectId) {
    let projects = JSON.parse(localStorage.getItem('st_projects') || '[]');
    return projects.find(p => p.id === projectId);
}

export async function updateProject(projectData) {
    let projects = JSON.parse(localStorage.getItem('st_projects') || '[]');
    const index = projects.findIndex(p => p.id === projectData.id);
    if (index !== -1) {
        projects[index] = { ...projects[index], ...projectData };
        localStorage.setItem('st_projects', JSON.stringify(projects));
        return projects[index];
    }
    return null;
}

export async function savePersonalityAssessment(userId, scores, experienceYears) {
    let assessments = JSON.parse(localStorage.getItem('st_personality_assessments') || '[]');
    const existingIndex = assessments.findIndex(a => a.userId === userId);
    const newAssessment = { userId, ...scores, experienceYears, completed: true };
    if (existingIndex !== -1) assessments[existingIndex] = newAssessment;
    else assessments.push(newAssessment);
    localStorage.setItem('st_personality_assessments', JSON.stringify(assessments));
    return newAssessment;
}

export async function getPersonalityAssessment(userId) {
    let assessments = JSON.parse(localStorage.getItem('st_personality_assessments') || '[]');
    return assessments.find(a => a.userId === userId);
}

export async function enrollInProject(projectId, userId, techScore) {
    let enrollments = JSON.parse(localStorage.getItem('st_enrollments') || '[]');
    if (enrollments.some(e => e.projectId === projectId && e.userId === userId)) return false;
    enrollments.push({ projectId, userId, techScore });
    localStorage.setItem('st_enrollments', JSON.stringify(enrollments));
    return true;
}

export async function getEnrollmentsForProject(projectId) {
    let enrollments = JSON.parse(localStorage.getItem('st_enrollments') || '[]');
    return enrollments.filter(e => e.projectId === projectId);
}

export async function getEnrollmentsForUser(userId) {
    let enrollments = JSON.parse(localStorage.getItem('st_enrollments') || '[]');
    return enrollments.filter(e => e.userId === userId);
}

export async function saveGeneratedTeams(projectId, teamsData, tasksData) {
    const project = await getProjectById(projectId);
    if (!project) return null;
    project.teams = teamsData;
    project.status = 'active'; 
    await updateProject(project);

    let allTasks = JSON.parse(localStorage.getItem('st_tasks') || '[]');
    const projectTasks = tasksData.map(task => ({
        id: uid('task'), projectId: projectId, description: task.description, assignedUserId: task.assignedUserId, isCompleted: false
    }));
    allTasks.push(...projectTasks);
    localStorage.setItem('st_tasks', JSON.stringify(allTasks));
    return project;
}

export async function getTasksForProject(projectId) {
    let allTasks = JSON.parse(localStorage.getItem('st_tasks') || '[]');
    return allTasks.filter(t => t.projectId === projectId);
}

export async function updateTaskStatus(taskId, isCompleted) {
    let allTasks = JSON.parse(localStorage.getItem('st_tasks') || '[]');
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
        task.isCompleted = isCompleted;
        localStorage.setItem('st_tasks', JSON.stringify(allTasks));
    }
}

export async function submitFeedback(feedbackArray) {
    let allFeedback = JSON.parse(localStorage.getItem('st_feedback') || '[]');
    allFeedback.push(...feedbackArray.map(f => ({ id: uid('fb'), ...f })));
    localStorage.setItem('st_feedback', JSON.stringify(allFeedback));
}
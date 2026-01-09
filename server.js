const http = require('http');
const fs = require('fs');
const path = require('path');

// 数据存储文件
const DATA_FILE = path.join(__dirname, 'data.json');

// 页面访问密码（可以从配置文件读取，这里暂时硬编码）
const PAGE_ACCESS_PASSWORD = 'ftc2025'; // 默认密码，可以在后续优化为可配置的

// 管理员访问密码
const ADMIN_PASSWORD = '281192024'; // 默认管理员密码，可以在后续优化为可配置的

// 读取所有数据
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
        // 初始化数据结构
        return {
            users: {},
            teams: {},
            scoutingData: {}
        };
    } catch (error) {
        console.error('读取数据失败:', error);
        return {
            users: {},
            teams: {},
            scoutingData: {}
        };
    }
}

// 保存所有数据
function saveData(data) {
    try {
        console.log('保存数据到文件:', DATA_FILE);
        console.log('要保存的数据:', data);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('数据保存成功');
        return true;
    } catch (error) {
        console.error('保存数据失败:', error);
        return false;
    }
}

// 读取用户数据
function readUsers() {
    const data = readData();
    return data.users || {};
}

// 保存用户数据
function saveUsers(users) {
    console.log('保存用户数据:', users);
    const data = readData();
    data.users = users;
    const result = saveData(data);
    console.log('保存用户数据结果:', result);
    return result;
}

// 读取团队数据
function readTeams() {
    const data = readData();
    return data.teams || {};
}

// 保存团队数据
function saveTeams(teams) {
    const data = readData();
    data.teams = teams;
    return saveData(data);
}

// 读取侦察数据
function readScoutingData() {
    const data = readData();
    return data.scoutingData || {};
}

// 保存侦察数据
function saveScoutingData(scoutingData) {
    const data = readData();
    data.scoutingData = scoutingData;
    return saveData(data);
}

// 简单的密码哈希函数
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return (hash >>> 0).toString(16);
}

// 生成随机邀请码函数
function generateInviteCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 记录所有请求
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        console.log(`OPTIONS request handled for ${req.url}`);
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 解析请求体
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        // 记录请求体（如果有的话）
        if (body) {
            console.log(`Request body: ${body}`);
        }
        // 处理注册请求
        if (req.method === 'POST' && (req.url === '/api/register' || req.url.startsWith('/api/register?'))) {
            try {
                const data = JSON.parse(body);
                console.log('解析后的请求数据:', data);
                const { username, password, teamNumber, inviteCode } = data;
                
                if (!username || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名和密码不能为空' }));
                    return;
                }
                
                if (password.length < 6) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '密码长度不能少于6位' }));
                    return;
                }
                
                // 只有在没有邀请码的情况下，才需要验证队伍编号
                if (!inviteCode || !inviteCode.trim()) {
                    if (!teamNumber || !teamNumber.trim()) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '请输入队伍编号，必须加入或创建队伍' }));
                        return;
                    }
                }
                
                const users = readUsers();
                const teams = readTeams();
                
                if (users[username]) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名已存在' }));
                    return;
                }
                
                let team = null;
                let isCaptain = false;
                
                // 处理团队创建或加入
                if (inviteCode && inviteCode.trim()) {
                    // 通过邀请码加入团队
                    // 查找邀请码对应的团队
                    const teamEntry = Object.values(teams).find(t => t.inviteCode === inviteCode);
                    if (teamEntry) {
                        team = teamEntry.teamNumber;
                        if (!teamEntry.members.includes(username)) {
                            teamEntry.members.push(username);
                        }
                        // 保存团队数据
                        saveTeams(teams);
                    } else {
                        // 邀请码无效，返回错误
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '无效的邀请码' }));
                        return;
                    }
                } else {
                    // 创建新团队或加入已有团队
                    if (!teams[teamNumber]) {
                        // 创建新团队并生成邀请码
                        teams[teamNumber] = {
                            teamNumber,
                            captain: username,
                            members: [username],
                            inviteCode: generateInviteCode(),
                            createdAt: new Date().toISOString()
                        };
                        isCaptain = true;
                    } else {
                        // 加入已有团队
                        if (!teams[teamNumber].members.includes(username)) {
                            teams[teamNumber].members.push(username);
                        }
                        // 如果团队没有邀请码，生成一个
                        if (!teams[teamNumber].inviteCode) {
                            teams[teamNumber].inviteCode = generateInviteCode();
                        }
                    }
                    team = teamNumber;
                    // 保存团队数据
                    saveTeams(teams);
                }
                
                console.log('准备创建新用户');
                // 创建新用户
                const hashedPassword = hashPassword(password);
                console.log('密码哈希后:', hashedPassword);
                
                const newUser = {
                    username,
                    password: hashedPassword,
                    team,
                    isCaptain,
                    createdAt: new Date().toISOString()
                };
                
                console.log('新用户对象:', newUser);
                
                // 保存用户数据
                users[username] = newUser;
                const saveResult = saveUsers(users);
                console.log('保存用户结果:', saveResult);
                
                if (saveResult) {
                    // 数据保存成功，返回响应
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: '注册成功', user: { username: newUser.username, team: newUser.team, isCaptain: newUser.isCaptain } }));
                    console.log('注册响应已发送');
                } else {
                    // 数据保存失败，返回错误响应
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '注册失败，数据保存错误' }));
                    console.log('注册失败，数据保存错误');
                }
            } catch (error) {
                console.error('注册错误:', error);
                console.error('错误类型:', error.name);
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误', error: error.message }));
            }
        }
        
        // 处理保存侦察数据请求
        else if (req.method === 'POST' && (req.url === '/api/scouting-data' || req.url.startsWith('/api/scouting-data?'))) {
            try {
                const data = JSON.parse(body);
                const { userId, teamId, teamNumber, matchName, matchType, matchNumber, gameData, selectedMotif, timestamp, score } = data;
                
                if (!userId || !teamId || !teamNumber || !matchName || !matchType || !matchNumber || !gameData) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '数据不完整' }));
                    return;
                }
                
                const scoutingData = readScoutingData();
                
                // 生成唯一ID
                const dataId = `${userId}-${teamNumber}-${matchType}-${matchNumber}-${Date.now()}`;
                
                // 保存数据
                scoutingData[dataId] = {
                    id: dataId,
                    userId,
                    teamId,
                    teamNumber,
                    matchName,
                    matchType,
                    matchNumber,
                    gameData,
                    selectedMotif,
                    score,
                    timestamp: timestamp || new Date().toISOString(),
                    syncedAt: new Date().toISOString()
                };
                
                if (saveScoutingData(scoutingData)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: '数据保存成功', dataId }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                console.error('保存侦察数据错误:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 处理获取所有侦察数据请求
        else if (req.method === 'GET' && (req.url === '/api/scouting-data' || req.url.startsWith('/api/scouting-data?'))) {
            try {
                const scoutingData = readScoutingData();
                // 将对象转换为数组，方便前端处理
                const dataArray = Object.values(scoutingData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: dataArray }));
            } catch (error) {
                console.error('获取侦察数据错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '获取数据失败', error: error.message }));
            }
        }
        
        // 处理删除侦察数据请求
        else if (req.method === 'DELETE' && req.url.startsWith('/api/scouting-data/')) {
            try {
                const id = decodeURIComponent(req.url.split('/').pop());
                if (!id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '缺少数据ID' }));
                    return;
                }
                
                const scoutingData = readScoutingData();
                if (scoutingData[id]) {
                    delete scoutingData[id];
                    if (saveScoutingData(scoutingData)) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: '数据删除成功' }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '数据删除失败' }));
                    }
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '数据不存在' }));
                }
            } catch (error) {
                console.error('删除侦察数据错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '删除数据失败', error: error.message }));
            }
        }
        
        // 处理获取所有数据请求（用于后台管理）
        else if (req.method === 'GET' && (req.url === '/api/admin/data' || req.url.startsWith('/api/admin/data?'))) {
            try {
                // 从URL查询参数中获取管理员密码
                // 使用http://localhost:3001作为baseURL只是为了解析查询参数，实际主机和端口不影响功能
                // 因为URL构造函数需要baseURL来解析相对路径，但我们只关心查询参数
                const url = new URL(req.url, 'http://localhost:8080');
                const password = url.searchParams.get('password');
                
                // 验证管理员密码
                if (!password || password !== ADMIN_PASSWORD) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '管理员密码错误' }));
                    return;
                }
                
                const users = readUsers();
                const teams = readTeams();
                const scoutingData = readScoutingData();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    users,
                    teams,
                    scoutingData
                }));
            } catch (error) {
                console.error('获取管理数据错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        }
        
        // 处理获取特定用户信息请求
        else if (req.method === 'GET' && req.url.startsWith('/api/users/')) {
            try {
                const username = decodeURIComponent(req.url.split('/').pop());
                
                if (!username) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名不能为空' }));
                    return;
                }
                
                const users = readUsers();
                const user = users[username];
                
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    user: {
                        username: user.username,
                        team: user.team,
                        isCaptain: user.isCaptain,
                        createdAt: user.createdAt
                    }
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        }
        
        // 处理获取用户列表请求
        else if (req.method === 'GET' && (req.url === '/api/users' || req.url.startsWith('/api/users?'))) {
            try {
                const users = readUsers();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    users
                }));
            } catch (error) {
                console.error('获取用户列表错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        }
        
        // 处理获取特定队伍信息请求
        else if (req.method === 'GET' && req.url.startsWith('/api/team/')) {
            try {
                const teamNumber = req.url.split('/').pop();
                
                if (!teamNumber) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍编号不能为空' }));
                    return;
                }
                
                const teams = readTeams();
                const team = teams[teamNumber];
                
                if (!team) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍不存在' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    team: {
                        teamNumber: team.teamNumber,
                        captain: team.captain,
                        members: team.members,
                        inviteCode: team.inviteCode,
                        createdAt: team.createdAt
                    }
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        }
        
        // 处理获取队伍数据请求（用于前端）
        else if (req.method === 'GET' && (req.url === '/api/teams' || req.url.startsWith('/api/teams?'))) {
            try {
                const teams = readTeams();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    teams
                }));
            } catch (error) {
                console.error('获取队伍数据错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '服务器错误' }));
            }
        }
        
        // 处理获取侦察数据请求（支持两种路径格式）
        else if (req.method === 'GET' && (req.url === '/api/scouting-data' || req.url.startsWith('/api/scouting-data?') || req.url === '/api/scoutingData' || req.url.startsWith('/api/scoutingData?'))) {
            try {
                const scoutingData = readScoutingData();
                
                // 将对象转换为数组返回
                const scoutingDataArray = Object.values(scoutingData);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: scoutingDataArray
                }));
            } catch (error) {
                console.error('获取侦察数据错误:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '获取数据失败', error: error.message }));
            }
        }
        
        // 处理登录请求
        else if (req.method === 'POST' && (req.url === '/api/login' || req.url.startsWith('/api/login?'))) {
            try {
                const data = JSON.parse(body);
                const { username, password } = data;
                
                if (!username || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名和密码不能为空' }));
                    return;
                }
                
                const users = readUsers();
                const user = users[username];
                
                if (!user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                    return;
                }
                
                // 密码在前端已经哈希过，直接比较
                if (user.password !== password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '密码错误' }));
                    return;
                }
                
                // 登录成功
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '登录成功', 
                    user: { username: user.username, team: user.team } 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 处理注销用户请求
        else if (req.method === 'POST' && (req.url === '/api/logout' || req.url.startsWith('/api/logout?'))) {
            try {
                let username = null;
                
                // 只有当请求体不为空时才尝试解析
                if (body.trim()) {
                    const data = JSON.parse(body);
                    username = data.username;
                }
                
                // 记录注销日志
                console.log(`用户注销: ${username || '未知用户'}`);
                
                // 注销主要是前端操作（清除localStorage）
                // 后端可以记录注销日志或执行其他清理操作
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '注销成功' 
                }));
            } catch (error) {
                // 如果请求格式错误，仍然返回成功响应，因为注销主要是前端操作
                console.error('注销请求处理错误:', error);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '注销成功' 
                }));
            }
        }
        
        // 处理刷新邀请码请求
        else if (req.method === 'POST' && (req.url === '/api/refresh-invite-code' || req.url.startsWith('/api/refresh-invite-code?'))) {
            try {
                const data = JSON.parse(body);
                const { username, teamNumber } = data;
                
                if (!username || !teamNumber) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名和队伍编号不能为空' }));
                    return;
                }
                
                const teams = readTeams();
                const team = teams[teamNumber];
                
                if (!team) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍不存在' }));
                    return;
                }
                
                // 验证用户是否是队长
                if (team.captain !== username) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '只有队长可以刷新邀请码' }));
                    return;
                }
                
                // 生成新的邀请码
                team.inviteCode = generateInviteCode();
                
                if (saveTeams(teams)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '邀请码刷新成功',
                        inviteCode: team.inviteCode
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 退出队伍
        else if (req.method === 'POST' && (req.url === '/api/leave-team' || req.url.startsWith('/api/leave-team?'))) {
            try {
                const data = JSON.parse(body);
                const { username } = data;
                
                if (!username) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名不能为空' }));
                    return;
                }
                
                const users = readUsers();
                const teams = readTeams();
                
                const user = users[username];
                if (!user || !user.team) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户没有加入任何队伍' }));
                    return;
                }
                
                const teamNumber = user.team;
                const team = teams[teamNumber];
                
                if (!team) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍不存在' }));
                    return;
                }
                
                // 如果用户是队长，不能直接退出
                if (team.captain === username) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队长不能直接退出队伍，请先转让队长职务' }));
                    return;
                }
                
                // 从队伍成员中移除用户
                team.members = team.members.filter(member => member !== username);
                
                // 更新用户的队伍信息
                user.team = null;
                user.isCaptain = false;
                
                if (saveTeams(teams) && saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '成功退出队伍' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 移除队伍成员（队长权限）
        else if (req.method === 'POST' && (req.url === '/api/remove-team-member' || req.url.startsWith('/api/remove-team-member?'))) {
            try {
                const data = JSON.parse(body);
                const { captainUsername, teamNumber, memberUsername } = data;
                
                if (!captainUsername || !teamNumber || !memberUsername) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队长用户名、队伍编号和成员用户名不能为空' }));
                    return;
                }
                
                const teams = readTeams();
                const users = readUsers();
                
                const team = teams[teamNumber];
                if (!team) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍不存在' }));
                    return;
                }
                
                // 验证用户是否是队长
                if (team.captain !== captainUsername) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '只有队长可以移除队员' }));
                    return;
                }
                
                // 队长不能移除自己
                if (captainUsername === memberUsername) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队长不能移除自己' }));
                    return;
                }
                
                // 检查成员是否在队伍中
                if (!team.members.includes(memberUsername)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '该用户不是队伍成员' }));
                    return;
                }
                
                // 从队伍成员中移除用户
                team.members = team.members.filter(member => member !== memberUsername);
                
                // 更新用户的队伍信息
                const memberUser = users[memberUsername];
                if (memberUser) {
                    memberUser.team = null;
                    memberUser.isCaptain = false;
                }
                
                if (saveTeams(teams) && saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '成功移除队伍成员' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 验证页面访问密码
        else if (req.method === 'POST' && (req.url === '/api/verify-password' || req.url.startsWith('/api/verify-password?'))) {
            try {
                const data = JSON.parse(body);
                const { password } = data;
                
                if (!password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '密码不能为空' }));
                    return;
                }
                
                if (hashPassword(password) === hashPassword(PAGE_ACCESS_PASSWORD)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '密码验证成功' 
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: '密码错误' 
                    }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 解散队伍功能
        else if (req.method === 'POST' && (req.url === '/api/dissolve-team' || req.url.startsWith('/api/dissolve-team?'))) {
            try {
                const data = JSON.parse(body);
                const { username, teamNumber } = data;
                
                if (!username || !teamNumber) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名和队伍编号不能为空' }));
                    return;
                }
                
                const teams = readTeams();
                const users = readUsers();
                
                const team = teams[teamNumber];
                if (!team) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '队伍不存在' }));
                    return;
                }
                
                // 验证用户是否是队长
                if (team.captain !== username) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '只有队长可以解散队伍' }));
                    return;
                }
                
                // 将队伍中的所有成员的队伍信息重置
                team.members.forEach(member => {
                    const user = users[member];
                    if (user) {
                        user.team = null;
                        user.isCaptain = false;
                    }
                });
                
                // 删除队伍
                delete teams[teamNumber];
                
                if (saveTeams(teams) && saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '队伍解散成功' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 更改密码功能
        else if (req.method === 'POST' && (req.url === '/api/change-password' || req.url.startsWith('/api/change-password?'))) {
            try {
                const data = JSON.parse(body);
                const { username, currentPassword, newPassword } = data;
                
                if (!username || !currentPassword || !newPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名、当前密码和新密码不能为空' }));
                    return;
                }
                
                if (newPassword.length < 6) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '新密码长度不能少于6位' }));
                    return;
                }
                
                const users = readUsers();
                const user = users[username];
                
                if (!user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                    return;
                }
                
                // 验证当前密码
                const hashedCurrentPassword = hashPassword(currentPassword);
                if (user.password !== hashedCurrentPassword) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '当前密码错误' }));
                    return;
                }
                
                // 密码验证通过，更新为新密码
                const hashedNewPassword = hashPassword(newPassword);
                user.password = hashedNewPassword;
                
                if (saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '密码更改成功' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 管理员密码验证功能
        else if (req.method === 'POST' && (req.url === '/api/verify-admin-password' || req.url.startsWith('/api/verify-admin-password?'))) {
            try {
                const data = JSON.parse(body);
                const { password } = data;
                
                if (!password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '管理员密码不能为空' }));
                    return;
                }
                
                // 验证管理员密码
                // 注意：这里使用明文比较，实际应用中应该使用加密比较
                if (password === ADMIN_PASSWORD) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '管理员密码验证通过' 
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '管理员密码错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 后端注销用户功能
        else if (req.method === 'POST' && (req.url === '/api/delete-user' || req.url.startsWith('/api/delete-user?'))) {
            try {
                const data = JSON.parse(body);
                const { username, password } = data;
                
                if (!username || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名和密码不能为空' }));
                    return;
                }
                
                const users = readUsers();
                const teams = readTeams();
                
                const user = users[username];
                if (!user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                    return;
                }
                
                // 验证密码
                const hashedPassword = hashPassword(password);
                if (user.password !== hashedPassword) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '密码错误' }));
                    return;
                }
                
                // 如果用户在队伍中，从队伍中移除
                if (user.team) {
                    const teamNumber = user.team;
                    const team = teams[teamNumber];
                    if (team) {
                        // 如果用户是队长，需要重新指定队长或解散队伍
                        if (team.captain === username) {
                            if (team.members.length === 1) {
                                // 如果是唯一成员，删除队伍
                                delete teams[teamNumber];
                            } else {
                                // 否则，将队长职位转移给下一个成员
                                team.captain = team.members.find(member => member !== username);
                                // 更新该成员的isCaptain状态
                                const newCaptain = users[team.captain];
                                if (newCaptain) {
                                    newCaptain.isCaptain = true;
                                }
                                // 从队伍成员中移除用户
                                team.members = team.members.filter(member => member !== username);
                            }
                            saveTeams(teams);
                        } else {
                            // 如果用户不是队长，直接从队伍成员中移除
                            team.members = team.members.filter(member => member !== username);
                            saveTeams(teams);
                        }
                    }
                }
                
                // 删除用户
                delete users[username];
                
                if (saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '用户注销成功' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 管理员删除用户功能
        else if (req.method === 'POST' && (req.url === '/api/admin/delete-user' || req.url.startsWith('/api/admin/delete-user?'))) {
            try {
                const data = JSON.parse(body);
                const { username, password } = data;
                
                // 验证管理员密码
                if (!password || password !== ADMIN_PASSWORD) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '管理员密码错误' }));
                    return;
                }
                
                if (!username) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名不能为空' }));
                    return;
                }
                
                const users = readUsers();
                const teams = readTeams();
                
                const user = users[username];
                if (!user) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                    return;
                }
                
                // 如果用户在队伍中，从队伍中移除
                if (user.team) {
                    const teamNumber = user.team;
                    const team = teams[teamNumber];
                    if (team) {
                        // 如果用户是队长，需要重新指定队长或解散队伍
                        if (team.captain === username) {
                            if (team.members.length === 1) {
                                // 如果是唯一成员，删除队伍
                                delete teams[teamNumber];
                            } else {
                                // 否则，将队长职位转移给下一个成员
                                team.captain = team.members.find(member => member !== username);
                                // 更新该成员的isCaptain状态
                                const newCaptain = users[team.captain];
                                if (newCaptain) {
                                    newCaptain.isCaptain = true;
                                }
                                // 从队伍成员中移除用户
                                team.members = team.members.filter(member => member !== username);
                            }
                            saveTeams(teams);
                        } else {
                            // 如果用户不是队长，直接从队伍成员中移除
                            team.members = team.members.filter(member => member !== username);
                            saveTeams(teams);
                        }
                    }
                }
                
                // 删除用户
                delete users[username];
                
                if (saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: '用户注销成功' 
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 处理根路径请求
        else if (req.method === 'GET' && req.url === '/') {
            const filePath = path.join(__dirname, 'index.html');
            
            if (fs.existsSync(filePath)) {
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '文件不存在' }));
            }
        }
        // 处理静态文件请求
        else if (req.method === 'GET' && req.url.endsWith('.html')) {
            const fileName = req.url.substring(1); // 移除开头的斜杠
            const filePath = path.join(__dirname, fileName);
            
            if (fs.existsSync(filePath)) {
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '文件不存在' }));
            }
        }
        // 其他请求
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: '接口不存在' }));
        }
    });
});

// 启动服务器
// 使用环境变量端口或默认端口（8080），以便在云服务上正常运行
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    console.log(`可以通过 http://localhost:${PORT} 或 http://<本机IP地址>:${PORT} 访问`);
});

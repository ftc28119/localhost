const http = require('http');
const fs = require('fs');
const path = require('path');

// 数据存储文件
const DATA_FILE = path.join(__dirname, 'data.json');

// 页面访问密码（可以从配置文件读取，这里暂时硬编码）
const PAGE_ACCESS_PASSWORD = 'ftc2025'; // 默认密码，可以在后续优化为可配置的

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
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
    const data = readData();
    data.users = users;
    return saveData(data);
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
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
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
        // 处理注册请求
        if (req.method === 'POST' && req.url === '/api/register') {
            try {
                const data = JSON.parse(body);
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
                if (teamNumber && !inviteCode) {
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
                } else if (inviteCode) {
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
                    }
                }
                
                // 创建新用户
                const newUser = {
                    username,
                    password: hashPassword(password),
                    team,
                    isCaptain,
                    createdAt: new Date().toISOString()
                };
                
                users[username] = newUser;
                
                if (saveUsers(users)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: '注册成功', user: { username: newUser.username, team: newUser.team, isCaptain: newUser.isCaptain } }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '服务器错误' }));
                }
            } catch (error) {
                console.error('注册错误:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 处理保存侦察数据请求
        else if (req.method === 'POST' && req.url === '/api/scouting-data') {
            try {
                const data = JSON.parse(body);
                const { userId, teamId, teamNumber, matchName, matchType, matchNumber, gameData, selectedMotif, timestamp } = data;
                
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
        
        // 处理获取所有数据请求（用于后台管理）
        else if (req.method === 'GET' && req.url === '/api/admin/data') {
            try {
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
        
        // 处理登录请求
        else if (req.method === 'POST' && req.url === '/api/login') {
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
                    res.end(JSON.stringify({ success: false, message: '用户名或密码错误' }));
                    return;
                }
                
                const hashedPassword = hashPassword(password);
                if (user.password !== hashedPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '用户名或密码错误' }));
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
        else if (req.method === 'POST' && req.url === '/api/logout') {
            try {
                const data = JSON.parse(body);
                const { username } = data;
                
                // 注销主要是前端操作（清除localStorage）
                // 后端可以记录注销日志或执行其他清理操作
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '注销成功' 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: '请求格式错误' }));
            }
        }
        
        // 处理刷新邀请码请求
        else if (req.method === 'POST' && req.url === '/api/refresh-invite-code') {
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
        
        // 获取队伍信息
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
        
        // 退出队伍
        else if (req.method === 'POST' && req.url === '/api/leave-team') {
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
        else if (req.method === 'POST' && req.url === '/api/remove-team-member') {
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
        else if (req.method === 'POST' && req.url === '/api/verify-password') {
            try {
                const data = JSON.parse(body);
                const { password } = data;
                
                if (!password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '密码不能为空' }));
                    return;
                }
                
                if (password === PAGE_ACCESS_PASSWORD) {
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
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

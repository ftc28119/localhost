const http = require('http');
const fs = require('fs');
const path = require('path');

// 数据存储文件
const DATA_FILE = path.join(__dirname, 'data.json');

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
                        // 创建新团队
                        teams[teamNumber] = {
                            teamNumber,
                            captain: username,
                            members: [username],
                            createdAt: new Date().toISOString()
                        };
                        isCaptain = true;
                    } else {
                        // 加入已有团队
                        if (!teams[teamNumber].members.includes(username)) {
                            teams[teamNumber].members.push(username);
                        }
                    }
                    team = teamNumber;
                    // 保存团队数据
                    saveTeams(teams);
                } else if (inviteCode) {
                    // 通过邀请码加入团队（这里简化处理，实际应该有更复杂的邀请码验证）
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

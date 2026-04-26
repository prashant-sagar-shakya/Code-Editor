const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config();

const fs = require("fs");


const app = express();
app.use(express.json());
app.use(express.static("public"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post("/compile", (req, res) => {
    const { code, input, lang } = req.body;
    let fileName, compileCmd, runCmd;

    if (lang === "Cpp") {
        fileName = "temp.cpp";
        fs.writeFileSync(fileName, code);
        compileCmd = `g++ ${fileName} -o temp.exe`;
        runCmd = `temp.exe`;
    } else if (lang === "C") {
        fileName = "temp.c";
        fs.writeFileSync(fileName, code);
        compileCmd = `gcc ${fileName} -o temp.exe`;
        runCmd = `temp.exe`;
    } else if (lang === "Java") {
        fileName = "Main.java";
        fs.writeFileSync(fileName, code);
        compileCmd = `javac ${fileName}`;
        runCmd = `java Main`;
    } else if (lang === "Python") {
        fileName = "temp.py";
        fs.writeFileSync(fileName, code);
        runCmd = `python ${fileName}`;
    }

    const processInput = (cmd, args, isRun = false) => {
        return new Promise((resolve) => {
            const child = spawn(cmd, args, { shell: true });
            let output = "", error = "";
            if (isRun && input) {
                child.stdin.write(input);
                child.stdin.end();
            }
            child.stdout.on("data", (data) => output += data.toString());
            child.stderr.on("data", (data) => error += data.toString());
            child.on("close", (code) => resolve({ output, error, code }));
        });
    };

    const run = async () => {
        if (compileCmd) {
            const compileResult = await processInput(compileCmd.split(" ")[0], compileCmd.split(" ").slice(1));
            if (compileResult.code !== 0) return res.send({ error: compileResult.error });
        }
        const runResult = await processInput(runCmd.split(" ")[0], runCmd.split(" ").slice(1), true);
        res.send({ output: runResult.output, error: runResult.error });
    };
    run();
});

app.post("/chat", async (req, res) => {
    const { message, context } = req.body;
    const prompt = `Context: A code editor with this code:\n${context}\n\nUser: ${message}`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (response.status === 429) {
            return res.status(429).send({ 
                error: "Rate Limit Exceeded", 
                message: "AI is a bit busy. Please wait a few seconds before trying again.",
                details: data.error 
            });
        }

        if (data.candidates && data.candidates.length > 0) {
            res.send({ reply: data.candidates[0].content.parts[0].text });
        } else {
            console.error("Gemini Error:", data);
            res.status(response.status || 500).send({ 
                error: "Gemini API Error", 
                details: data.error || "Unknown error" 
            });
        }
    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).send({ error: "Internal Server Error" });
    }

});

app.post("/autocomplete", async (req, res) => {
    const { code, line, ch } = req.body;
    const prompt = `Task: Complete this code from line ${line+1}, col ${ch}.\nCODE:\n${code}\nRule: Return ONLY raw code continuation. NO markdown. NO talk.`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (response.status === 429) {
            return res.status(429).send({ error: "Rate Limit" });
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            let suggestion = data.candidates[0].content.parts[0].text || "";
            suggestion = suggestion.replace(/```(?:\w+)?\n?/g, "").replace(/```/g, "").trim();
            res.send({ suggestion });
        } else {
            res.send({ suggestion: "" });
        }
    } catch (e) {
        res.status(500).send({ error: "Fail" });
    }
});

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`SERVER LIVE: http://localhost:${PORT}`);
});

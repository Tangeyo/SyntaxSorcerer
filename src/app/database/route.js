import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pinecone } from "../config/pinecone/pineconeInit";
import { generateEmbeddings } from "./embeddingService";
import fs from "fs";
import path from "path";
import { readCodeFromFile } from "./readCodeFromFile";

export async function POST(request) {
    const res = await request.json();
    const userInput = res.prompt;

    // Print an error message if the codebase doesn't exist
    const codebasePath = path.join(
        process.cwd(), 
       `codebase${cookies().get('seed').value}`
    );
   
    if (!fs.existsSync(codebasePath)) {
        return NextResponse.json({ text: "You haven't uploaded a codebase yet! Please try again." });
    }

    const shortPath = `codebase${cookies().get('seed').value}/`;

    if (!userInput) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }
  
    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json({ error: "API key is missing" }, { status: 500 });
    }
    
    const input = [userInput];

    const embed = await generateEmbeddings(input);    

    try {
        const files = await pinecone.similaritySearch(embed); // Using default values
        let answer = "The most relevant code chunks to your query are ";

        const filesToSend = [];

        for (let i = 0; i < files.matches.length; i++) {
            if (files.matches.length == 0) {
                answer = "No files relevant to your query could be found.";
            }
            else if (files.matches.length == 1) {
                answer = `The most relevant file to your query is the ${files.matches[i].metadata.type} \`\`\`${files.matches[i].id}\`\`\` (from \`\`\`${files.matches[i].metadata.filepath.substring(process.cwd().length)}\`\`\`) with a score of ${files.matches[i].score}.`;
            }
            else if (i == files.matches.length-1) {
                answer = answer.concat(`and the ${files.matches[i].metadata.type} \`\`\`${files.matches[i].id}\`\`\` (from \`\`\`${files.matches[i].metadata.filepath.substring(shortPath.length)}\`\`\`) with a score of ${files.matches[i].score}.`);
            }
            else {
                answer = answer.concat(`the ${files.matches[i].metadata.type} \`\`\`${files.matches[i].id}\`\`\` (from \`\`\`${files.matches[i].metadata.filepath.substring(shortPath.length)}\`\`\`) with a score of ${files.matches[i].score}, `);
            }
            const code = await readCodeFromFile(process.cwd().concat('/'+files.matches[i].metadata.filepath));
            if (!filesToSend.includes(code)) {
                filesToSend.push(code);
            }
        }

        return NextResponse.json({ text: answer, files: filesToSend }); 
    }
    catch (error) {
        console.error("Error querying user input: ", error);
        return NextResponse.json({ error: `Error querying user input: ${error}` }, { status: 500 });
    }
};
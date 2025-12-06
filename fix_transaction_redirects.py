import re

# Read the file
with open('app/routes/transactions.$id.edit.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1: Update delete redirect
content = content.replace(
    '            // Delete the transaction\n            await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();\n        }\n\n        return redirect("/transactions");',
    '            // Delete the transaction\n            await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();\n            \n            // Redirect based on transaction type\n            const redirectPath = t.type === "OUT" ? "/transactions?type=OUT" : "/transactions?type=IN";\n            return redirect(redirectPath);\n        }\n\n        return redirect("/transactions");'
)

# Replace 2: Update edit redirect  
content = content.replace(
    '    // Update action\n    const date = formData.get("date");\n    const department = formData.get("department");\n    const handler_name = formData.get("handler_name");\n    const note = formData.get("note");\n\n    // Update only the editable fields (not product, quantity, or type)\n    await env.DB.prepare(`\n        UPDATE transactions \n        SET date = ?, department = ?, handler_name = ?, note = ?\n        WHERE id = ?\n    `).bind(date, department, handler_name, note, id).run();\n\n    return redirect("/transactions");',
    '    // Update action\n    const date = formData.get("date");\n    const department = formData.get("department");\n    const handler_name = formData.get("handler_name");\n    const note = formData.get("note");\n    \n    // Get transaction type for redirect\n    const { results: transactionData } = await env.DB.prepare(\n        "SELECT type FROM transactions WHERE id = ?"\n    ).bind(id).all();\n\n    // Update only the editable fields (not product, quantity, or type)\n    await env.DB.prepare(`\n        UPDATE transactions \n        SET date = ?, department = ?, handler_name = ?, note = ?\n        WHERE id = ?\n    `).bind(date, department, handler_name, note, id).run();\n\n    // Redirect based on transaction type\n    if (transactionData && transactionData.length > 0) {\n        const redirectPath = transactionData[0].type === "OUT" ? "/transactions?type=OUT" : "/transactions?type=IN";\n        return redirect(redirectPath);\n    }\n    \n    return redirect("/transactions");'
)

# Write back
with open('app/routes/transactions.$id.edit.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Transaction edit file updated successfully!")

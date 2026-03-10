import pexpect

child = pexpect.spawn('python3 -m pdb sample.py', encoding='utf-8')
child.expect_exact('(Pdb)')

def pdb_command(cmd):
    child.sendline(cmd)
    
    child.expect_exact('(Pdb)')
    
    # Return everything between the command sent and the new prompt
    return child.before

print("--- Step 1 ---")
print(pdb_command('n'))

print("--- Step 2 ---")
print(pdb_command('n'))

print("--- Step 3 ---")
print(pdb_command("{k: v for k,v in locals().items() if '__' not in k and 'pdb' not in k}"))

child.sendline('import os; os._exit(0)')
child.close()

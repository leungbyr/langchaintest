"""
Build a 3×3 matrix (rows 0,1,2 then 3,4,5 then 6,7,8), set the top-left
cell to -1, then print. Expected: only [0][0] is -1.
"""

matrix = []
row = []
for i in range(3):
    row.clear()
    for j in range(3):
        row.append(i * 3 + j)
    matrix.append(row)

matrix[0][0] = -1
print(matrix)

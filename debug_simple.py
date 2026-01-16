
import openpyxl
import sys
import os

file_path = r"c:\Users\gonza\Desktop\PricingEngine\public\Dashboard_Report_2026-01-16 (15).xlsx"
wb = openpyxl.load_workbook(file_path)
print("SHEETS:", wb.sheetnames)

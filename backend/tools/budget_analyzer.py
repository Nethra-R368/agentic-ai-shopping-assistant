from langchain_core.tools import tool

@tool
def budget_analyzer(product_price: float, user_budget: float) -> str:
    """
    Check if a product is affordable based on the user's budget.
    Also provides a brief value-for-money analysis.
    """
    diff = user_budget - product_price
    
    if diff >= 0:
        return f"This product is within budget! The user will have ${diff:.2f} left over."
    else:
        return f"This product is OVER the budget by ${abs(diff):.2f}. Recommend finding a cheaper alternative."

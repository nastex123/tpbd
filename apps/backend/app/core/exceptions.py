"""Custom exceptions and RFC 7807 Problem Details handlers."""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.schemas.common import ProblemDetails, ValidationErrorItem


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        title: str,
        status_code: int,
        detail: str,
        error_type: str = "https://tpbd.nasa.gov/errors/general",
        invalid_params: list[ValidationErrorItem] | None = None,
    ):
        super().__init__(detail)
        self.title = title
        self.status_code = status_code
        self.detail = detail
        self.error_type = error_type
        self.invalid_params = invalid_params


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            title="Resource Not Found",
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} '{identifier}' could not be found.",
            error_type="https://tpbd.nasa.gov/errors/not-found",
        )


class NonEvaluableTrendError(AppException):
    def __init__(self, reason: str, sample_count: int = 0):
        super().__init__(
            title="Non-Evaluable Trend Analysis",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=reason,
            error_type="https://tpbd.nasa.gov/errors/non-evaluable-trend",
            invalid_params=[
                ValidationErrorItem(name="points", reason=f"Samples: {sample_count}. {reason}")
            ],
        )


def register_exception_handlers(app):
    """Register RFC 7807 error handlers on the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        problem = ProblemDetails(
            type=exc.error_type,
            title=exc.title,
            status=exc.status_code,
            detail=exc.detail,
            instance=request.url.path,
            invalid_params=exc.invalid_params,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        invalid_params = []
        for error in exc.errors():
            loc = " -> ".join(str(l) for l in error.get("loc", []))
            invalid_params.append(
                ValidationErrorItem(name=loc, reason=error.get("msg", "Invalid value"))
            )

        problem = ProblemDetails(
            type="https://tpbd.nasa.gov/errors/validation-error",
            title="Validation Error",
            status=status.HTTP_400_BAD_REQUEST,
            detail="The request parameters failed validation.",
            instance=request.url.path,
            invalid_params=invalid_params,
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=problem.model_dump(exclude_none=True),
            media_type="application/problem+json",
        )

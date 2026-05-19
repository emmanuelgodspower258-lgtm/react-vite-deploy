import React from 'react';

type Props = {
    children: React.ReactNode;
    label: string;
};

type State = {
    error: Error | null;
};

export class RouteErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error) {
        console.error(`${this.props.label} crashed`, error);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
                    <div className="rounded-3xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 text-red-700 dark:text-red-200">
                        <h1 className="text-xl font-black mb-2">{this.props.label} could not load</h1>
                        <p className="text-sm font-semibold">{this.state.error.message}</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

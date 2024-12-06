# Problem Analysis Tab
with tab1:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Define Your Business Challenge")
        st.markdown("""
        Examples of business problems:
        - How Incentive Programs Improve Business Performance
        - What factors are driving the rise in claims costs in specific geographic regions?
        - How can we enhance cross-selling opportunities for insurance products across different customer segments?
        """)

        main_problem = st.text_area(
            "Describe your business challenge",
            placeholder="E.g., We are experiencing a 15% increase in customer churn rate over the last quarter..."
        )
        
        # Add buttons in columns
        col1_1, col1_2 = st.columns(2)
        with col1_1:
            if st.button("Break Down Problem"):
                sub_questions = watchmen_sdk.create_data_story_and_generate_sub_questions(main_problem)
                sub_problems = []
                for sub_question in sub_questions:
                    sub_problems.append(sub_question['question'])
                st.session_state.problems = sub_problems

        with col1_2:
            if st.button("Regenerate Questions"):
                if main_problem:
                    sub_questions = watchmen_sdk.create_data_story_and_generate_sub_questions(main_problem)
                    sub_problems = []
                    for sub_question in sub_questions:
                        sub_problems.append(sub_question['question'])
                    st.session_state.problems = sub_problems
                else:
                    st.warning("Please enter a business challenge first")

    with col2:
        st.subheader("Problem Components")
        if st.session_state.problems:
            # Create a container for problems with selection and deletion
            for idx, prob in enumerate(st.session_state.problems):
                col2_1, col2_2, col2_3 = st.columns([0.1, 0.8, 0.1])
                
                with col2_1:
                    # Add checkbox for selection
                    selected = st.checkbox("", key=f"select_prob_{idx}", 
                                        value=False)
                    if selected:
                        if 'selected_problems' not in st.session_state:
                            st.session_state.selected_problems = []
                        if prob not in st.session_state.selected_problems:
                            st.session_state.selected_problems.append(prob)
                    else:
                        if 'selected_problems' in st.session_state and prob in st.session_state.selected_problems:
                            st.session_state.selected_problems.remove(prob)
                
                with col2_2:
                    st.info(prob)
                
                with col2_3:
                    # Add delete button
                    if st.button("🗑️", key=f"delete_prob_{idx}"):
                        st.session_state.problems.pop(idx)
                        st.rerun()
        else:
            st.write("Enter your business challenge and click 'Break Down Problem' to see the analysis components.")

        # Add button to delete selected problems
        if st.session_state.problems:
            if st.button("Delete Selected"):
                if 'selected_problems' in st.session_state and st.session_state.selected_problems:
                    st.session_state.problems = [p for p in st.session_state.problems 
                                              if p not in st.session_state.selected_problems]
                    st.session_state.selected_problems = []
                    st.rerun()
                else:
                    st.warning("Please select problems to delete") 